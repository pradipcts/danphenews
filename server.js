import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

import config from './src/config/index.js';
import connectDB from './src/config/db.js';
import v1Routes from './src/routes/v1/index.js';
import errorMiddleware from './src/middlewares/error.middleware.js';

// Initialize app
const app = express();
app.set('trust proxy', 1); // for Render/Vercel/Heroku

// Connect to MongoDB
connectDB();

// Apply rate limiting
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests, please try again later.',
}));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Secure headers
app.use(helmet());

// ✅ Allowlist for CORS
const allowedOrigins = [
    'http://localhost:3000',
    'https://newsdaphe.vercel.app',   // <-- fixed this domain
    'https://danphenews.vercel.app',   // You can keep both if needed
    // daphenews.com
    'https://danphenews.com',
    'https://www.danphenews.com',

];

// CORS middleware with logging
app.use(cors({
    origin: (origin, callback) => {
        console.log(`[CORS] Incoming request from origin: ${origin}`);
        // Allow requests with no origin (like curl, Postman)
        if (!origin) {
            console.log('[CORS] No origin - allowed');
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            console.log(`[CORS] Origin allowed: ${origin}`);
            return callback(null, true);
        }
        console.log(`[CORS] Origin NOT allowed: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Set-Cookie', 'Date', 'ETag', 'X-RateLimit-Reset'],
    optionsSuccessStatus: 200,
    maxAge: 600
}));

// CORS error handler middleware (to catch errors from CORS)
app.use((err, req, res, next) => {
    if (err && err.message === 'Not allowed by CORS') {
        console.error('[CORS ERROR]', err.message, `Origin: ${req.headers.origin}`);
        return res.status(403).json({
            success: false,
            message: 'CORS Error: This origin is not allowed.',
            origin: req.headers.origin
        });
    }
    next(err);
});

// Custom security headers
app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src *"
    );
    next();
});

// Logging all requests with origin info
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr Origin=:req[origin]'));

// Routes
app.use('/api/v1', v1Routes);

// Health Check
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
    });
});

// Root
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Danphe News API',
        version: process.env.npm_package_version || '1.0.0',
        environment: config.env,
        documentation: `${config.clientUrl}/docs`,
        uptime: process.uptime()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestedUrl: req.originalUrl,
        method: req.method,
        suggestions: [
            '/api/v1/news',
            '/api/v1/auth/login',
            '/api/v1/auth/register'
        ]
    });
});

// Global error handler
app.use(errorMiddleware);

// Start server
const PORT = config.port || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${config.env} mode on port ${PORT}`);
});

// Graceful shutdown handlers
['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
        console.log(`${signal} received. Shutting down gracefully...`);
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
    });
});

// Handle uncaught exceptions & rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
});
