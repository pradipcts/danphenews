// config/index.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Helper to parse boolean-like env values
const toBool = (val) => val === 'true' || val === true;

// Parse frontend URLs
const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://newsdaphe.vercel.app',
    'https://danphenews.vercel.app',
    'https://danphenews.com',
    'https://www.danphenews.com',
    'https://staging.daphenews.com',
    'https://preview.daphenews.com',
    'https://dev.daphenews.com',
    'https://admin.daphenews.com',
    'https://dashboard.daphenews.com',
    'https://app.daphenews.com',
    'https://mobile.daphenews.com',
    'https://fwu-soe.vercel.app',
    'https://soenotes.vercel.app',
    'https://soe-notes.vercel.app',
    'https://quiz.fwu.daphenews.com',
    'https://entrance.fwu.daphenews.com',
    ...envOrigins
];

console.log('🔧 Loaded environment variables:');
console.log({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CLIENT_URL: process.env.CLIENT_URL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    MONGODB_URI: process.env.MONGODB_URI ? '[SET]' : '[NOT SET]',
    JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[NOT SET]',
    // Don't expose other secrets
});

console.log('🌐 Allowed CORS origins:', allowedOrigins);

const config = {
    env: process.env.NODE_ENV || 'development',
    port: +process.env.PORT || 5000,
    clientUrl: process.env.CLIENT_URL?.split(',').map(s => s.trim()) || ['http://localhost:3000'],
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/blog-backend',
        options: { useNewUrlParser: true, useUnifiedTopology: true, autoIndex: process.env.NODE_ENV !== 'production' },
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'dev_secret',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
        cookieOptions: {
            httpOnly: true,
            secure: toBool(process.env.COOKIE_SECURE) || process.env.NODE_ENV === 'production',
            sameSite: process.env.COOKIE_SAMESITE || 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        },
    },
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        host: process.env.EMAIL_HOST,
        port: +process.env.EMAIL_PORT || 587,
        secure: toBool(process.env.EMAIL_SECURE),
        username: process.env.EMAIL_USERNAME,
        password: process.env.EMAIL_PASSWORD,
        from: process.env.EMAIL_FROM || 'no-reply@blogapp.com',
        templatesDir: path.join(__dirname, '../emails/templates'),
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: +process.env.RATE_LIMIT_MAX || 100,
    },
    logging: {
        level: process.env.LOG_LEVEL || 'debug',
        dir: process.env.LOG_DIR || 'logs',
    },
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
    ...(process.env.NODE_ENV === 'production' && { secureCookies: true, trustProxy: true }),
};

if (!config.database.uri) throw new Error('❌ MONGODB_URI is required');
if (!config.auth.jwtSecret && config.env === 'production') throw new Error('❌ JWT_SECRET is required in production');

export default config;
