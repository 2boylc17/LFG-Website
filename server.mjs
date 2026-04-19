import cookieParser from 'cookie-parser';
import express from 'express';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import ViteExpress from 'vite-express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.mjs';
import gameRoutes from './routes/games.mjs';
import groupRoutes from './routes/groups.mjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const db_user = encodeURIComponent(process.env.db_user);
const db_password = encodeURIComponent(process.env.db_password);
const db_cluster = process.env.db_cluster;
const DB_URI = `mongodb+srv://${db_user}:${db_password}@${db_cluster}`;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

mongoose.connect(DB_URI).then(() => 
    console.log('Connected to MongoDB')
).catch((err) => 
    console.log(err));

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/groups', groupRoutes);

const server = ViteExpress.listen(app, PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const io = new Server(server, {
    cors: {
        origin: true,
        credentials: true
    }
});

app.set('io', io);

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

const rejectSocket = (next, message, code, details) => {
    const error = new Error(message);
    error.data = {
        code,
        details
    };
    return next(error);
};

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

io.engine.on('connection_error', (error) => {
    console.error('Socket engine connection error:', {
        code: error?.code,
        message: error?.message,
        context: error?.context
    });
});

io.on('connection', (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);

    socket.emit('socket:ready', {
        userId: socket.userId,
        username: socket.username
    });

    socket.on('dm:typing', ({ toUserId, isTyping }) => {
        if (!toUserId) return;

        io.to(`user:${toUserId}`).emit('dm:typing', {
            fromUserId: socket.userId,
            isTyping: Boolean(isTyping)
        });
    });
});