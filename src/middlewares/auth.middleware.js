import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import asyncHandler from 'express-async-handler';

export const protect = asyncHandler(async (req, res, next) => {
    let token = null;

    // Get token from header or cookies
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
        token = req.cookies.token;
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }

    try {
        const decoded = jwt.verify(token, config.auth.jwtSecret);

        // Standardize to use _id instead of id
        req.user = {
            _id: decoded._id || decoded.id, // Handle both formats
            name: decoded.name || '',
            email: decoded.email || '',
            role: decoded.role,
            tokenSource: req.headers.authorization ? 'header' : 'cookie'
        };

        console.log('Authenticated user:', {
            _id: req.user._id,
            role: req.user.role
        });

        next();
    } catch (err) {
        console.error('JWT Error:', err.message);
        res.status(401);
        throw new Error('Not authorized, token failed');
    }
});

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.error('Authorization failed for:', req.user?.role);
            res.status(403);
            throw new Error('Not authorized for this action');
        }
        next();
    };
};