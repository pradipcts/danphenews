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
import { handleImageUpload } from '../../middlewares/upload.js';
import Advertisement from '../../models/advertisement.model.js';

// ==========================
// Public API Routes
// ==========================

// GET all ads - public
router.get(
    '/',
    advancedResults(Advertisement, 'createdBy'),
    getAdvertisements
);

// POST new ad - public
router.post(
    '/',
    handleImageUpload,
    createAdvertisement
);

// GET single ad - public
router.get('/:id', getAdvertisement);

// Get ads by position - public
router.get('/position/:position', getAdsByPosition);

// Record ad click - public
router.put('/:id/click', recordAdClick);

// ==========================
// Protected API Routes (PUT & DELETE)
// ==========================
router.put(
    '/:id',
    protect,
    authorize('admin', 'editor'),
    handleImageUpload,
    updateAdvertisement
);

router.delete(
    '/:id',
    protect,
    authorize('admin', 'editor'),
    deleteAdvertisement
);

// ==========================
// 🧪 Test Route (Dev only)
// ==========================
if (process.env.NODE_ENV === 'development') {
    router.get('/test', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Advertisement routes are working!',
            timestamp: new Date().toISOString(),
            version: '1.2',
            note: 'GET & POST routes are public; PUT & DELETE are protected'
        });
    });
}

export default router;
