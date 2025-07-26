import express from 'express';
import {
    getUsers,
    getUser,
    updateUser,
    deleteUser,
    updateFavoriteCategories,
    getUserStats,
} from '../../controllers/user.controller.js';

import { protect, authorize } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Log middleware for this router
router.use((req, res, next) => {
    console.log(`🔹 ${req.method} ${req.originalUrl}`);
    console.log(`🔐 Authenticated user: ${req.user?.name || 'Not logged in'}`);
    next();
});

// ✅ Admin-only: Get all users
router
    .route('/')
    .get(protect, authorize('admin'), (req, res, next) => {
        console.log('📥 Fetching all users...');
        next();
    }, getUsers);

// ✅ Admin-only: Stats
router
    .route('/stats')
    .get(protect, authorize('admin'), (req, res, next) => {
        console.log('📊 Fetching user stats...');
        next();
    }, getUserStats);

// ✅ Authenticated user: Update favorites
router
    .route('/favorites')
    .put(protect, (req, res, next) => {
        console.log('❤️ Updating favorite categories...');
        console.log('➡️ New Categories:', req.body.categories);
        next();
    }, updateFavoriteCategories);

// ✅ Admin-only: Get, update, or delete user by ID
router
    .route('/:id')
    .get(protect, authorize('admin'), (req, res, next) => {
        console.log(`📄 Fetching user with ID: ${req.params.id}`);
        next();
    }, getUser)
    .put(protect, (req, res, next) => {
        console.log(`✏️ Updating user with ID: ${req.params.id}`);
        console.log('➡️ Payload:', req.body);
        next();
    }, updateUser)
    .delete(protect, authorize('admin'), (req, res, next) => {
        console.log(`🗑️ Deleting user with ID: ${req.params.id}`);
        next();
    }, deleteUser);

export default router;
