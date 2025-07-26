import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';               // <-- Add mongoose for health check
import config from '../../config/index.js';

// Import route files
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import newsRoutes from './news.routes.js';    // <-- Import news routes

const router = express.Router();

// Security middleware
router.use(helmet());
router.use(
    cors({
        origin: config.clientUrl,
        credentials: true,
    })
);

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Enhanced router validation
const validateAndMountRouter = (route, path) => {
    if (!route || typeof route.use !== 'function' || typeof route.handle !== 'function') {
        throw new Error(`Invalid router for path ${path}`);
    }

    // Apply rate limiting to all routes except auth
    if (path !== '/auth') {
        router.use(path, apiLimiter);
    }

    router.use(path, route);
    console.log(`Successfully mounted routes for ${path}`);
};

// Route mounting with error handling
try {
    validateAndMountRouter(authRoutes, '/auth');
    validateAndMountRouter(userRoutes, '/users');
    validateAndMountRouter(newsRoutes, '/news');       // <-- Mount news routes
} catch (error) {
    console.error('Route initialization failed:', error);
    process.exit(1); // Exit if routes fail to mount
}

// API Documentation route
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'News Portal API',
        version: '1.0.0',
        endpoints: {
            auth: {
                login: 'POST /api/v1/auth/login',
                register: 'POST /api/v1/auth/register',
                forgotPassword: 'POST /api/v1/auth/forgotpassword',
            },
            users: {
                getUsers: 'GET /api/v1/users',
                getUser: 'GET /api/v1/users/:id',
                updateProfile: 'PUT /api/v1/users/:id',
            },
            news: {
                getAllNews: 'GET /api/v1/news',
                getNewsByIdOrSlug: 'GET /api/v1/news/:idOrSlug',
                createNews: 'POST /api/v1/news',
                updateNews: 'PUT /api/v1/news/:id',
                deleteNews: 'DELETE /api/v1/news/:id',
            },
        },
        documentation: `${config.clientUrl}/api-docs`,
    });
});

// Health check with system status
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: config.env,
    });
});

// Enhanced 404 handler
router.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ENDPOINT_NOT_FOUND',
            message: 'The requested API endpoint does not exist',
            suggestedActions: [
                'Check the API documentation for available endpoints',
                'Verify the HTTP method (GET, POST, etc.)',
                'Ensure the URL path is correct',
            ],
        },
    });
});

// Production error handler
const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const response = {
        success: false,
        error: {
            code: err.code || 'INTERNAL_SERVER_ERROR',
            message: err.message || 'An unexpected error occurred',
        },
    };

    if (config.env === 'development') {
        response.error.stack = err.stack;
        response.error.details = {
            path: req.path,
            method: req.method,
            timestamp: new Date().toISOString(),
        };
    }

    // Log detailed error in development
    if (statusCode >= 500) {
        console.error('Server Error:', {
            error: err.stack,
            request: {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
                body: req.body,
            },
        });
    }

    res.status(statusCode).json(response);
};

router.use(errorHandler);

export default router;
