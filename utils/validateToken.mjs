import jwt from 'jsonwebtoken'

export const validateToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.token_secret);
        return decoded;
    } catch (err) {
        console.error("Token validation error:", err);
        return null;
    }
};