import express from 'express';
import { generateTokenAndSetCookie } from "../utils/generateToken.mjs";
import bcrypt from 'bcrypt';
import User from '../models/User.mjs';
import { validateToken } from '../utils/validateToken.mjs';

const router = express.Router();

router.post('/register', async (req, res) => {
    console.log("Yes")
    try {
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        } else if (req.body.password == "") {
            return res.status(400).json({ message: 'Password cannot be empty' });
        } else {
            const user = await User.create({
                username: req.body.username,
                password: req.body.password
            });
            generateTokenAndSetCookie(user._id, res);
            res.status(201).json({ message: 'User registered successfully' });
        }
    } catch (err) {
        console.error("Registration error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const userFound = await User.findOne({ username: req.body.username });
        if (userFound) {
            const passwordCorrect = await bcrypt.compare(req.body.password, userFound.password);
            if (passwordCorrect) {
                generateTokenAndSetCookie(userFound._id, userFound.username, res);
                res.status(200).json({ message: 'Login successful', username: userFound.username });
            } else {
                res.status(400).json({ message: 'Invalid username or password' });
            }
        } else {
            res.status(400).json({ message: 'Invalid username or password' });
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/logout', async (req, res) => {
    try {
        res.cookie('jwt', '', { maxAge: 0 });
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


router.head('/validate', async (req, res) => {
    const token = req.cookies.jwt;
    try {
        if (validateToken(token)) {
            res.status(200).json({ message: 'Token is valid' });
        } else {
            res.cookie('jwt', '', { maxAge: 0 });
            res.status(401).json({ message: 'Token is invalid' });
        }
    } catch (err) {
        console.error("Validation error:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
