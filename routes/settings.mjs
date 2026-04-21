import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import { validateToken } from '../utils/validateToken.mjs';

const router = express.Router();

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

// PUT update profile (bio, platforms, playStyle)
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
