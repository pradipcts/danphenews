// ------------------------------
// Main Server Initialization File
// ------------------------------

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Internal Configs and Middleware
import config from './src/config/index.js';
import connectDB from './src/config/db.js';
import v1Routes from './src/routes/v1/index.js';
import errorMiddleware from './src/middlewares/error.middleware.js';

// Initialize Express App
const app = express();
app.set('trust proxy', 1); // Trust proxy headers for deployment (e.g., Vercel, Render)

// Connect to MongoDB
connectDB();

// Rate Limiting for all requests
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Too many requests, please try again later.',
}));

// Cookie and Body Parsing
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Security Headers
app.use(helmet());

// CORS Configuration with Logging
const allowedOrigins = [
    'http://localhost:3000',
    'https://newsdaphe.vercel.app',
    'https://danphenews.vercel.app',
    'https://danphenews.com',
    'https://www.danphenews.com',
];

app.use(cors({
    origin: (origin, callback) => {
        console.log(`[CORS] Origin: ${origin}`);
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie', 'Date', 'ETag', 'X-RateLimit-Reset'],
    optionsSuccessStatus: 200,
    maxAge: 600,
}));

// CORS Error Handling
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        console.error('[CORS ERROR]', err.message);
        return res.status(403).json({ success: false, message: 'CORS Error', origin: req.headers.origin });
    }
    next(err);
});

// Custom Security Headers
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

// Request Logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr Origin=:req[origin]'));

// Mount API Routes
app.use('/api/v1', v1Routes);

// Health Check Route
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbStatus,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
    });
});

// Root Route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Danphe News API',
        version: process.env.npm_package_version || '1.0.0',
        environment: config.env,
        documentation: `${config.clientUrl}/docs`,
        uptime: process.uptime(),
    });
});

// 404 Not Found Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requestedUrl: req.originalUrl,
        method: req.method,
        suggestions: [
            '/api/v1/news',
            '/api/v1/auth/login',
            '/api/v1/auth/register',
            '/api/v1/advertisements'
        ]
    });
});

// Global Error Handler
app.use(errorMiddleware);

// Start Server
const PORT = config.port || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${config.env} mode on port ${PORT}`);
});

// Graceful Shutdown
['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
        console.log(`${signal} received. Shutting down...`);
        server.close(() => process.exit(0));
    });
});

// Global Uncaught Error Handling
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
});