import jwt from 'jsonwebtoken';

export const validateToken = (token) => {
    try {
        return jwt.verify(token, process.env.token_secret);
    } catch (error) {
	    console.error("Token validation error:", error);
        return null;
    }
};