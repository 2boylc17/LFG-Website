import jwt from 'jsonwebtoken';

// Verify & decode JWT token
export const validateToken = (token) => {
    if (!token || !String(token).trim()) {
        return null;
    }

    try {
        return jwt.verify(token, process.env.token_secret);
    } catch (error) {
        console.error('Token validation error:', error);
        return null;
    }
};