import express from 'express';
import {
    createNews,
    getNews,
    getNewsByIdOrSlug,
    updateNews,
    deleteNews
} from '../../controllers/news.controller.js';
import { protect, authorize } from '../../middlewares/auth.middleware.js';
import { handleImageUpload } from '../../middlewares/upload.js';

const router = express.Router();

// Public routes
router.get('/', getNews);
router.get('/:idOrSlug', getNewsByIdOrSlug);

// Protected routes
router.post(
    '/',
    protect,
    authorize('author', 'editor', 'admin'),
    handleImageUpload,
    createNews
);

router.put(
    '/:id',
    protect,
    authorize('author', 'editor', 'admin'),
    updateNews
);

router.delete(
    '/:id',
    protect,
    authorize('author', 'admin'),
    deleteNews
);

export default router;