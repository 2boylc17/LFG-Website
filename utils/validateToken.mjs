import jwt from 'jsonwebtoken';

export const validateToken = (token) => {
    try {
        return jwt.verify(token, process.env.token_secret);
    } catch (err) {
        console.error("Token validation error:", err);
        return null;
    }
};