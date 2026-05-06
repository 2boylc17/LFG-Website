import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import ViteExpress from 'vite-express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.mjs';
import gameRoutes from './routes/games.mjs';
import groupRoutes from './routes/groups.mjs';
import settingsRoutes from './routes/settings.mjs';
import Group from './models/Group.mjs';
import User from './models/User.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// MongoDB connection string
const db_user = encodeURIComponent(process.env.db_user);
const db_password = encodeURIComponent(process.env.db_password);
const db_cluster = process.env.db_cluster;
const DB_URI = `mongodb+srv://${db_user}:${db_password}@${db_cluster}`;
// CORS allowed origins
const CLIENT_ORIGIN = String(process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/+$/, '');
const ADDITIONAL_CLIENT_ORIGINS = String(process.env.ADDITIONAL_CLIENT_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
const ALLOWED_ORIGINS = [CLIENT_ORIGIN, ...ADDITIONAL_CLIENT_ORIGINS, 'http://localhost:5173'];

// Check if origin allowed for CORS
const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const normalizedOrigin = String(origin).replace(/\/+$/, '');
    if (ALLOWED_ORIGINS.includes(normalizedOrigin)) return true;

    // Allow Vercel preview deployments when credentials are required.
    return /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(normalizedOrigin);
};

// CORS config delegate for dynamic origin checking
const corsOptionsDelegate = (req, callback) => {
    const requestOrigin = req.header('Origin');
    const allowed = isAllowedOrigin(requestOrigin);

    callback(null, {
        origin: allowed ? requestOrigin || true : false,
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    });
};

// Middleware setup
app.use(cors(corsOptionsDelegate));
app.options(/.*/, cors(corsOptionsDelegate));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ ok: true, uptime: process.uptime() });
});

// Connect to MongoDB
mongoose.connect(DB_URI).then(() => 
    console.log('Connected to MongoDB')
).catch((err) => 
    console.log(err));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settings', settingsRoutes);

let server;

// Production: serve static dist folder
if (isProduction) {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
    server = app.listen(PORT, HOST, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
    });
} else {
    server = ViteExpress.listen(app, PORT, () => {
        console.log(`Server running on ${HOST}:${PORT}`);
    });
}

// Socket.IO server setup
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
        credentials: true
    }
});

app.set('io', io);

// In-memory chat history: groupId -> messages
const groupChatHistory = new Map();
const maxGroupChatMessages = 100;
// In-memory DM history: userA:userB -> messages
const directMessageHistory = new Map();
const maxDirectMessagePerThread = 200;
// Grace period before removing idle group members
const groupLeaveGraceMs = 20 * 1000;
// Group TTL (24 hours)
const groupMaxAgeMs = 24 * 60 * 60 * 1000;
// Track active group sessions per membership
const activeGroupSessions = new Map();
const pendingGroupRemovals = new Map();

// Generate DM thread key from two user IDs
const getDirectMessageThreadKey = (userAId, userBId) => {
    return [String(userAId || ''), String(userBId || '')].sort().join(':');
};

// Check if user is friend with another user
const isFriend = (userDoc, friendId) => {
    return Array.isArray(userDoc?.friends)
        && userDoc.friends.some((existingFriendId) => String(existingFriendId) === String(friendId));
};

// Parse cookie header string
const parseCookieHeader = (rawCookieHeader) => {
    if (!rawCookieHeader) return {};

    return rawCookieHeader
        .split(';')
        .map((cookiePart) => cookiePart.trim())
        .filter(Boolean)
        .reduce((acc, cookiePart) => {
            const [key, ...valueParts] = cookiePart.split('=');
            if (!key) return acc;
            acc[key] = valueParts.join('=');
            return acc;
        }, {});
};

// Reject socket connection with error
const rejectSocket = (next, message, code, details) => {
    const error = new Error(message);
    error.data = {
        code,
        details
    };
    return next(error);
};

// Generate membership key for user in group
const getMembershipKey = (groupId, userId) => `${groupId}:${userId}`;

// Check if group has expired by TTL
const isExpiredGroup = (group) => {
    if (!group?.createdAt) return true;
    return (Date.now() - new Date(group.createdAt).getTime()) >= groupMaxAgeMs;
};

// Clear pending removal timer for user
const clearPendingRemoval = (groupId, userId) => {
    const membershipKey = getMembershipKey(groupId, userId);
    const pendingTimeout = pendingGroupRemovals.get(membershipKey);
    if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        pendingGroupRemovals.delete(membershipKey);
    }
};

// Send ACK callback if provided
const sendAck = (ack, payload) => {
    if (typeof ack === 'function') ack(payload);
};

// Remove user from group (delete if empty/expired)
const removeUserFromGroup = async (groupId, userId) => {
    const group = await Group.findByIdAndUpdate(
        groupId,
        { $pull: { members: userId, pendingMembers: userId } },
        { new: true }
    )
        .populate('owner', 'username')
        .populate('game', 'name image')
        .populate('members', 'username')
        .populate('pendingMembers', 'username');

    if (!group) {
        groupChatHistory.delete(String(groupId));
        return null;
    }

    const shouldDelete = isExpiredGroup(group) || !Array.isArray(group.members) || group.members.length === 0;
    if (shouldDelete) {
        await Group.deleteOne({ _id: groupId });
        groupChatHistory.delete(String(groupId));
        io.to(`group:${groupId}`).emit('group:deleted', {
            groupId: String(groupId),
            message: 'Group is no longer available'
        });
        return null;
    }

    const ownerId = String(group.owner?._id || group.owner || '');
    const removedUserId = String(userId || '');
    if (!ownerId || ownerId === removedUserId) {
        const nextOwner = group.members[0]?._id;
        if (nextOwner) {
            group.owner = nextOwner;
            await group.save();
            await group.populate('owner', 'username');
        }
    }

    io.to(`group:${groupId}`).emit('group:members:updated', {
        groupId: String(groupId),
        group
    });

    return group;
};

// Schedule user removal after grace period
const scheduleGroupRemoval = (groupId, userId) => {
    clearPendingRemoval(groupId, userId);

    const membershipKey = getMembershipKey(groupId, userId);
    const timeoutId = setTimeout(async () => {
        pendingGroupRemovals.delete(membershipKey);
        try {
            await removeUserFromGroup(groupId, userId);
        } catch (error) {
            console.error('Delayed group removal error:', error);
        }
    }, groupLeaveGraceMs);

    pendingGroupRemovals.set(membershipKey, timeoutId);
};

// Track active socket for group membership
const trackActiveGroupSession = (groupId, userId, socketId) => {
    const membershipKey = getMembershipKey(groupId, userId);
    const existingSessions = activeGroupSessions.get(membershipKey) || new Set();
    existingSessions.add(socketId);
    activeGroupSessions.set(membershipKey, existingSessions);
    clearPendingRemoval(groupId, userId);
};

// Untrack socket from group membership
const untrackActiveGroupSession = (groupId, userId, socketId) => {
    const membershipKey = getMembershipKey(groupId, userId);
    const existingSessions = activeGroupSessions.get(membershipKey);
    if (!existingSessions) return;

    existingSessions.delete(socketId);
    if (existingSessions.size === 0) {
        activeGroupSessions.delete(membershipKey);
        scheduleGroupRemoval(groupId, userId);
        return;
    }

    activeGroupSessions.set(membershipKey, existingSessions);
};

// Authenticate Socket.IO connection via JWT
io.use((socket, next) => {
    try {
        const rawCookieHeader = socket.handshake.headers.cookie;
        if (!rawCookieHeader) {
            return rejectSocket(next, 'Authentication required', 'AUTH_COOKIE_MISSING', 'No cookie header was sent with the Socket.IO handshake.');
        }

        const parsedCookies = parseCookieHeader(rawCookieHeader);

        const token = parsedCookies.jwt;
        if (!token) {
            return rejectSocket(next, 'Authentication required', 'AUTH_JWT_MISSING', 'JWT cookie was not found in the handshake cookies.');
        }

        if (!process.env.token_secret) {
            return rejectSocket(next, 'Invalid auth token', 'AUTH_SECRET_MISSING', 'Server token secret is missing.');
        }

        const decoded = jwt.verify(token, process.env.token_secret);
        if (!decoded?.userId) {
            return rejectSocket(next, 'Invalid auth token', 'AUTH_INVALID_PAYLOAD', 'Token payload did not include a userId.');
        }

        socket.userId = decoded.userId;
        socket.username = decoded.username;
        return next();
    } catch (error) {
        console.error('Socket auth error:', error?.message || error);
        return rejectSocket(next, 'Invalid auth token', 'AUTH_VERIFY_FAILED', error?.message || 'Token verification failed.');
    }
});

// Log Socket.IO engine connection errors
io.engine.on('connection_error', (error) => {
    console.error('Socket engine connection error:', {
        code: error?.code,
        message: error?.message,
        context: error?.context
    });
});

// Handle new socket connection
io.on('connection', (socket) => {
    // User room for targeted broadcasts
    const userRoom = `user:${socket.userId}`;
    // Track groups user has joined
    socket.joinedGroupIds = new Set();
    socket.join(userRoom);

    // Notify client socket is ready
    socket.emit('socket:ready', {
        userId: socket.userId,
        username: socket.username
    });

    // Notify recipient of typing status
    socket.on('dm:typing', ({ toUserId, isTyping }) => {
        if (!toUserId) return;

        io.to(`user:${toUserId}`).emit('dm:typing', {
            fromUserId: socket.userId,
            isTyping: Boolean(isTyping)
        });
    });

    // Get message history with friend
    socket.on('dm:thread:get', async ({ withUsername }, ack) => {
        try {
            const targetUsername = String(withUsername || '').trim();
            if (!targetUsername) {
                sendAck(ack, { ok: false, message: 'Friend username is required' });
                return;
            }

            const currentUser = await User.findById(socket.userId).select('_id username friends');
            if (!currentUser) {
                sendAck(ack, { ok: false, message: 'User not found' });
                return;
            }

            const targetUser = await User.findOne({ username: targetUsername }).select('_id username');
            if (!targetUser) {
                sendAck(ack, { ok: false, message: 'Friend not found' });
                return;
            }

            if (!isFriend(currentUser, targetUser._id)) {
                sendAck(ack, { ok: false, message: 'You can only message friends' });
                return;
            }

            const threadKey = getDirectMessageThreadKey(currentUser._id, targetUser._id);
            const history = directMessageHistory.get(threadKey) || [];

            sendAck(ack, { ok: true, messages: history });
        } catch (error) {
            sendAck(ack, { ok: false, message: 'Failed to load conversation' });
        }
    });

    // Send direct message to friend
    socket.on('dm:message:send', async ({ toUsername, text }, ack) => {
        try {
            const targetUsername = String(toUsername || '').trim();
            const normalizedText = String(text || '').trim();

            if (!targetUsername) {
                sendAck(ack, { ok: false, message: 'Friend username is required' });
                return;
            }

            if (!normalizedText) {
                sendAck(ack, { ok: false, message: 'Message cannot be empty' });
                return;
            }

            if (normalizedText.length > 500) {
                sendAck(ack, { ok: false, message: 'Message must be 500 characters or fewer' });
                return;
            }

            const currentUser = await User.findById(socket.userId).select('_id username friends');
            if (!currentUser) {
                sendAck(ack, { ok: false, message: 'User not found' });
                return;
            }

            const targetUser = await User.findOne({ username: targetUsername }).select('_id username');
            if (!targetUser) {
                sendAck(ack, { ok: false, message: 'Friend not found' });
                return;
            }

            if (!isFriend(currentUser, targetUser._id)) {
                sendAck(ack, { ok: false, message: 'You can only message friends' });
                return;
            }

            const messagePayload = {
                _id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                text: normalizedText,
                createdAt: new Date().toISOString(),
                senderId: String(currentUser._id),
                senderUsername: currentUser.username,
                recipientId: String(targetUser._id),
                recipientUsername: targetUser.username
            };

            const threadKey = getDirectMessageThreadKey(currentUser._id, targetUser._id);
            const history = directMessageHistory.get(threadKey) || [];
            history.push(messagePayload);
            if (history.length > maxDirectMessagePerThread) {
                history.splice(0, history.length - maxDirectMessagePerThread);
            }
            directMessageHistory.set(threadKey, history);

            io.to(`user:${String(currentUser._id)}`).emit('dm:message:new', messagePayload);
            io.to(`user:${String(targetUser._id)}`).emit('dm:message:new', messagePayload);

            sendAck(ack, { ok: true });
        } catch (error) {
            sendAck(ack, { ok: false, message: 'Failed to send message' });
        }
    });

    socket.on('group:join', async ({ groupId }, ack) => {
        try {
            if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
                sendAck(ack, { ok: false, message: 'Valid group id is required' });
                return;
            }

            const existingGroup = await Group.findById(groupId);
            if (!existingGroup) {
                sendAck(ack, { ok: false, message: 'Group not found' });
                return;
            }

            if (isExpiredGroup(existingGroup)) {
                await Group.deleteOne({ _id: groupId });
                groupChatHistory.delete(String(groupId));
                sendAck(ack, { ok: false, message: 'Group is no longer available' });
                return;
            }

            const userIsMember = Array.isArray(existingGroup.members)
                && existingGroup.members.some((memberId) => String(memberId) === String(socket.userId));
            if (!userIsMember) {
                sendAck(ack, { ok: false, message: 'Join the group before entering chat' });
                return;
            }

            const updatedGroup = await Group.findById(groupId)
                .populate('owner', 'username')
                .populate('game', 'name image')
                .populate('members', 'username')
                .populate('pendingMembers', 'username');

            if (!updatedGroup) {
                sendAck(ack, { ok: false, message: 'Group not found' });
                return;
            }

            socket.join(`group:${groupId}`);
            socket.joinedGroupIds.add(String(groupId));
            // Track user as active in group
            trackActiveGroupSession(String(groupId), String(socket.userId), socket.id);
            const history = groupChatHistory.get(groupId) || [];

            io.to(`group:${groupId}`).emit('group:members:updated', {
                groupId,
                group: updatedGroup
            });

            sendAck(ack, {
                ok: true,
                history,
                group: updatedGroup
            });
        } catch (error) {
            sendAck(ack, { ok: false, message: 'Failed to join group chat' });
        }
    });

    // Leave group chat room
    socket.on('group:leave', ({ groupId }) => {
        if (!groupId) return;
        const normalizedGroupId = String(groupId);
        socket.joinedGroupIds?.delete(normalizedGroupId);
        socket.leave(`group:${groupId}`);
        // Untrack user, schedule removal if no other sessions
        untrackActiveGroupSession(normalizedGroupId, String(socket.userId), socket.id);
    });

    // Send message to group chat
    socket.on('group:message:send', ({ groupId, text }, ack) => {
        try {
            const normalizedGroupId = String(groupId || '').trim();
            const normalizedText = String(text || '').trim();

            if (!normalizedGroupId || !mongoose.Types.ObjectId.isValid(normalizedGroupId)) {
                sendAck(ack, { ok: false, message: 'Valid group id is required' });
                return;
            }

            if (!normalizedText) {
                sendAck(ack, { ok: false, message: 'Message text is required' });
                return;
            }

            const messagePayload = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                groupId: normalizedGroupId,
                senderId: socket.userId,
                senderUsername: socket.username || 'Unknown',
                text: normalizedText,
                createdAt: new Date().toISOString()
            };

            // Store message in history (bounded)
            const history = groupChatHistory.get(normalizedGroupId) || [];
            history.push(messagePayload);
            if (history.length > maxGroupChatMessages) {
                history.splice(0, history.length - maxGroupChatMessages);
            }
            groupChatHistory.set(normalizedGroupId, history);

            // Broadcast message to group
            io.to(`group:${normalizedGroupId}`).emit('group:message:new', messagePayload);

            sendAck(ack, { ok: true, message: messagePayload });
        } catch (error) {
            sendAck(ack, { ok: false, message: 'Failed to send message' });
        }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
        for (const groupId of socket.joinedGroupIds || []) {
            untrackActiveGroupSession(String(groupId), String(socket.userId), socket.id);
        }
        socket.joinedGroupIds?.clear();
    });
});