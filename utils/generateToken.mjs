import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = (userId, username, res) => {
    const token = jwt.sign({ userId, username }, process.env.token_secret, { expiresIn: '7d' });
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: 'strict'
    });
};