import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import { validateToken } from '../utils/validateToken.mjs';

const router = express.Router();

// GET public profile by username
router.get('/public/:username', async (req, res) => {
    try {
        const username = String(req.params.username || '').trim();
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const user = await User.findOne({ username })
            .select('username bio platforms playStyle')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (err) {
        console.error('Public profile fetch error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Verify JWT and attach userId/username to req
const authenticate = (req, res, next) => {
    const token = req.cookies.jwt;
    const decoded = validateToken(token);
    if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
};

// GET current user settings
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Settings fetch error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET current user's friends
router.get('/friends', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('friends friendRequestsIncoming friendRequestsOutgoing')
            .populate('friends', 'username bio platforms playStyle')
            .populate('friendRequestsIncoming', 'username bio platforms playStyle')
            .populate('friendRequestsOutgoing', 'username bio platforms playStyle');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({
            friends: user.friends || [],
            incomingRequests: user.friendRequestsIncoming || [],
            outgoingRequests: user.friendRequestsOutgoing || []
        });
    } catch (err) {
        console.error('Friends fetch error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// GET incoming friend request count
router.get('/friends/request-count', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('friendRequestsIncoming');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ count: Array.isArray(user.friendRequestsIncoming) ? user.friendRequestsIncoming.length : 0 });
    } catch (err) {
        console.error('Friend request count error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST send friend request by username
router.post('/friends/request/:username', authenticate, async (req, res) => {
    try {
        const targetUsername = String(req.params.username || '').trim();
        if (!targetUsername) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const requester = await User.findById(req.userId)
            .select('username friends friendRequestsIncoming friendRequestsOutgoing');
        if (!requester) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (requester.username === targetUsername) {
            return res.status(400).json({ message: 'You cannot add yourself as a friend' });
        }

        const targetUser = await User.findOne({ username: targetUsername })
            .select('_id username friendRequestsIncoming friendRequestsOutgoing friends');
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const alreadyFriend = Array.isArray(requester.friends)
            && requester.friends.some((friendId) => String(friendId) === String(targetUser._id));

        if (alreadyFriend) {
            return res.status(200).json({ message: 'Already friends', relationStatus: 'friends' });
        }

        const hasOutgoingRequest = Array.isArray(requester.friendRequestsOutgoing)
            && requester.friendRequestsOutgoing.some((userId) => String(userId) === String(targetUser._id));
        if (hasOutgoingRequest) {
            return res.status(200).json({ message: 'Friend request already sent', relationStatus: 'outgoing' });
        }

        const hasIncomingRequestFromTarget = Array.isArray(requester.friendRequestsIncoming)
            && requester.friendRequestsIncoming.some((userId) => String(userId) === String(targetUser._id));
        if (hasIncomingRequestFromTarget) {
            return res.status(409).json({ message: 'This user already sent you a friend request', relationStatus: 'incoming' });
        }

        await Promise.all([
            User.findByIdAndUpdate(req.userId, { $addToSet: { friendRequestsOutgoing: targetUser._id } }),
            User.findByIdAndUpdate(targetUser._id, { $addToSet: { friendRequestsIncoming: req.userId } })
        ]);

        return res.status(200).json({ message: `Friend request sent to ${targetUser.username}`, relationStatus: 'outgoing' });
    } catch (err) {
        console.error('Send friend request error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST accept friend request from username
router.post('/friends/request/:username/accept', authenticate, async (req, res) => {
    try {
        const requesterUsername = String(req.params.username || '').trim();
        if (!requesterUsername) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const currentUser = await User.findById(req.userId).select('_id friendRequestsIncoming friends');
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const requesterUser = await User.findOne({ username: requesterUsername }).select('_id username friendRequestsOutgoing friends');
        if (!requesterUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const hasIncomingRequest = Array.isArray(currentUser.friendRequestsIncoming)
            && currentUser.friendRequestsIncoming.some((userId) => String(userId) === String(requesterUser._id));
        if (!hasIncomingRequest) {
            return res.status(404).json({ message: 'Friend request not found' });
        }

        await Promise.all([
            User.findByIdAndUpdate(req.userId, {
                $pull: { friendRequestsIncoming: requesterUser._id, friendRequestsOutgoing: requesterUser._id },
                $addToSet: { friends: requesterUser._id }
            }),
            User.findByIdAndUpdate(requesterUser._id, {
                $pull: { friendRequestsOutgoing: req.userId, friendRequestsIncoming: req.userId },
                $addToSet: { friends: req.userId }
            })
        ]);

        return res.status(200).json({ message: `You are now friends with ${requesterUser.username}` });
    } catch (err) {
        console.error('Accept friend request error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST reject friend request from username
router.post('/friends/request/:username/reject', authenticate, async (req, res) => {
    try {
        const requesterUsername = String(req.params.username || '').trim();
        if (!requesterUsername) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const requesterUser = await User.findOne({ username: requesterUsername }).select('_id username');
        if (!requesterUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await Promise.all([
            User.findByIdAndUpdate(req.userId, {
                $pull: { friendRequestsIncoming: requesterUser._id, friendRequestsOutgoing: requesterUser._id }
            }),
            User.findByIdAndUpdate(requesterUser._id, {
                $pull: { friendRequestsOutgoing: req.userId, friendRequestsIncoming: req.userId }
            })
        ]);

        return res.status(200).json({ message: `Rejected friend request from ${requesterUser.username}` });
    } catch (err) {
        console.error('Reject friend request error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// POST remove friend by username
router.post('/friends/remove/:username', authenticate, async (req, res) => {
    try {
        const targetUsername = String(req.params.username || '').trim();
        if (!targetUsername) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const currentUser = await User.findById(req.userId).select('_id username friends');
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (currentUser.username === targetUsername) {
            return res.status(400).json({ message: 'You cannot remove yourself' });
        }

        const targetUser = await User.findOne({ username: targetUsername }).select('_id username');
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isFriend = Array.isArray(currentUser.friends)
            && currentUser.friends.some((friendId) => String(friendId) === String(targetUser._id));

        if (!isFriend) {
            return res.status(404).json({ message: 'Friend not found' });
        }

        await Promise.all([
            User.findByIdAndUpdate(req.userId, {
                $pull: {
                    friends: targetUser._id,
                    friendRequestsIncoming: targetUser._id,
                    friendRequestsOutgoing: targetUser._id
                }
            }),
            User.findByIdAndUpdate(targetUser._id, {
                $pull: {
                    friends: req.userId,
                    friendRequestsIncoming: req.userId,
                    friendRequestsOutgoing: req.userId
                }
            })
        ]);

        return res.status(200).json({ message: `Removed ${targetUser.username} from friends` });
    } catch (err) {
        console.error('Remove friend error:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT update profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { bio, platforms, playStyle } = req.body;

        if (bio !== undefined && bio.length > 300) {
            return res.status(400).json({ message: 'Bio must be 300 characters or fewer' });
        }

        const allowedPlatforms = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'];
        if (platforms !== undefined && !platforms.every(p => allowedPlatforms.includes(p))) {
            return res.status(400).json({ message: 'Invalid platform value' });
        }

        const allowedPlayStyles = ['Casual', 'Competitive', 'Mixed', ''];
        if (playStyle !== undefined && !allowedPlayStyles.includes(playStyle)) {
            return res.status(400).json({ message: 'Invalid play style value' });
        }

        const update = {};
        if (bio !== undefined) update.bio = bio;
        if (platforms !== undefined) update.platforms = platforms;
        if (playStyle !== undefined) update.playStyle = playStyle;

        const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select('-password');
        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT change username
router.put('/username', authenticate, async (req, res) => {
    try {
        const { newUsername, password } = req.body;
        if (!newUsername || !password) {
            return res.status(400).json({ message: 'New username and current password are required' });
        }

        const trimmedUsername = newUsername.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
            return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const passwordCorrect = await bcrypt.compare(password, user.password);
        if (!passwordCorrect) {
            return res.status(400).json({ message: 'Incorrect password' });
        }

        const existing = await User.findOne({ username: trimmedUsername });
        if (existing) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        user.username = trimmedUsername;
        await user.save();
        res.json({ message: 'Username updated successfully', username: trimmedUsername });
    } catch (err) {
        console.error('Username update error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT change password
router.put('/password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const passwordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!passwordCorrect) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
