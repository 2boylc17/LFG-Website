import express from 'express';
import { generateTokenAndSetCookie } from "../utils/generateToken.mjs";
import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import { validateToken } from '../utils/validateToken.mjs';

const router = express.Router();

// Route to register a new user
router.post('/register', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        if (!password) {
            return res.status(400).json({ message: 'Password cannot be empty' });
        }

        const user = await User.create({ username, password });
        generateTokenAndSetCookie(user._id, user.username, res);
        return res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to log in
router.post('/login', async (req, res) => {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
        const userFound = await User.findOne({ username });
        if (!userFound) return res.status(400).json({ message: 'Invalid username or password' });

        const passwordCorrect = await bcrypt.compare(password, userFound.password);
        if (!passwordCorrect) return res.status(400).json({ message: 'Invalid username or password' });

        generateTokenAndSetCookie(userFound._id, userFound.username, res);
        return res.status(200).json({ message: 'Login successful', username: userFound.username });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Route to log out (clears JWT cookie)
router.post('/logout', async (req, res) => {
    try {
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('jwt', '', {
            maxAge: 0,
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction
        });
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Route to validate the current JWT
router.head('/validate', async (req, res) => {
    const token = req.cookies.jwt;
    try {
        if (validateToken(token)) {
            return res.status(200).json({ message: 'Token is valid' });
        } else {
            const isProduction = process.env.NODE_ENV === 'production';
            res.cookie('jwt', '', {
                maxAge: 0,
                httpOnly: true,
                sameSite: isProduction ? 'none' : 'lax',
                secure: isProduction
            });
            return res.status(401).json({ message: 'Token is invalid' });
        }
    } catch (err) {
        console.error("Validation error:", err);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
