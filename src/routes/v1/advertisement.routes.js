import express from 'express';
const router = express.Router();

import {
    createAdvertisement,
    deleteAdvertisement,
    getAdsByPosition,
    getAdvertisement,
    getAdvertisements,
    recordAdClick,
    updateAdvertisement,
} from '../../controllers/advertisement.controller.js';

import { advancedResults } from '../../middlewares/advancedresults.middleware.js';
import { authorize, protect } from '../../middlewares/auth.middleware.js';
import { handleImageUpload } from '../../middlewares/upload.js'; // Updated to use handleImageUpload
import Advertisement from '../../models/advertisement.model.js';

// ==========================
// 🔒 Admin/Editor API Routes
// ==========================

// @route   GET /api/v1/advertisements
// @desc    Get all advertisements with advanced filtering
// @access  Private (Admin/Editor)
router.route('/')
    .get(
        advancedResults(Advertisement, 'createdBy'), // Public GET route
        getAdvertisements
    )
    .post(
        protect,               // Protect POST route
        authorize('admin', 'editor'),
        handleImageUpload,
        createAdvertisement
    );

// @route   /api/v1/advertisements/:id
// @desc    Single ad operations (read/update/delete)
// @access  Private (Admin/Editor)
router.route('/:id')
    .get(protect, authorize('admin', 'editor'), getAdvertisement)
    .put(
        protect,
        authorize('admin', 'editor'),
        handleImageUpload, // Using the handleImageUpload middleware
        updateAdvertisement
    )
    .delete(protect, authorize('admin', 'editor'), deleteAdvertisement);

// ==========================
// 🌐 Public API Routes
// ==========================

// @route   GET /api/v1/advertisements/position/:position
// @desc    Get active ads by position (e.g., 'header', 'sidebar')
// @access  Public
router.get('/position/:position', getAdsByPosition);

// @route   PUT /api/v1/advertisements/:id/click
// @desc    Record an ad click
// @access  Public
router.put('/:id/click', recordAdClick);

// ==========================
// 🧪 Test Route (Dev only)
// ==========================
if (process.env.NODE_ENV === 'development') {
    router.get('/test', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Advertisement routes are working!',
            timestamp: new Date().toISOString(),
            version: '1.1',
            note: 'Now using handleImageUpload middleware'
        });
    });
}

export default router;