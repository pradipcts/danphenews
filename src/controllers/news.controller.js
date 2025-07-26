// controllers/news.controller.js
import asyncHandler from 'express-async-handler';
import News from '../models/news.model.js';

export const createNews = asyncHandler(async (req, res) => {
    const requestId = Math.random().toString(36).substring(2, 8);
    const { title, content, category, tags, status = 'draft' } = req.body;

    console.log(`[${requestId}] Request received to create news`);
    console.log(`[${requestId}] Authenticated user ID: ${req.user?._id}`);
    console.log(`[${requestId}] Title:`, title);
    console.log(`[${requestId}] Category:`, category);
    console.log(`[${requestId}] Status:`, status);
    console.log(`[${requestId}] Tags raw:`, tags);

    if (!title || !content || !category) {
        console.warn(`[${requestId}] Validation failed: Missing required fields`);
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            message: 'Title, content, and category are required'
        });
    }

    if (!req.user?._id) {
        console.warn(`[${requestId}] Unauthorized access`);
        return res.status(403).json({
            success: false,
            error: 'Authentication required',
            message: 'You must be logged in to create news'
        });
    }

    // ✅ Use the uploaded image from handleImageUpload
    const image = req.imageUrl || '';
    console.log(`[${requestId}] Uploaded image path:`, image);

    // Normalize tags
    let processedTags = [];
    if (typeof tags === 'string') {
        processedTags = tags.split(',').map(t => t.trim());
    } else if (Array.isArray(tags)) {
        processedTags = tags.map(t => t.trim());
    }
    console.log(`[${requestId}] Processed tags:`, processedTags);

    const news = await News.create({
        title,
        content,
        category,
        author: req.user._id,
        tags: processedTags,
        status,
        image,
        publishedAt: status === 'published' ? new Date() : null
    });

    console.log(`[${requestId}] News created with ID: ${news._id}`);

    const userDetails = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
    };

    return res.status(201).json({
        success: true,
        data: {
            id: news._id,
            title: news.title,
            content: news.content,
            category: news.category,
            status: news.status,
            author: userDetails,
            tags: news.tags,
            image: news.image, // ✅ Cloudinary URL now stored
            publishedAt: news.publishedAt,
            createdAt: news.createdAt,
            updatedAt: news.updatedAt
        }
    });
});

// Get all news (published by default)
export const getNews = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        status,  // no default value
        title = ''
    } = req.query;

    const query = {};

    // Only add status filter if provided and not empty
    if (status && status.trim() !== '') {
        query.status = status;
    }

    if (title && title.trim() !== '') {
        query.title = { $regex: title, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const total = await News.countDocuments(query);

    const newsList = await News.find(query)
        .populate('author', 'name email')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        count: newsList.length,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        data: newsList,
    });
});


// Get news by ID or slug
export const getNewsByIdOrSlug = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;
    let news;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
        news = await News.findById(idOrSlug).populate('author', 'name email');
    } else {
        news = await News.findOne({ slug: idOrSlug }).populate('author', 'name email');
    }

    if (!news) {
        res.status(404);
        throw new Error('News article not found');
    }

    // Increment view count asynchronously, but don't block response
    news.viewsCount = (news.viewsCount || 0) + 1;
    news.save().catch(err => console.error('Failed to increment viewsCount:', err));

    res.status(200).json({ success: true, data: news });
});

// Update news article
export const updateNews = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
        res.status(404);
        throw new Error('News article not found');
    }

    // Only author or admin can update
    if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to update this news article');
    }

    const { title, content, tags, status, featuredImage } = req.body;

    if (title) news.title = title;
    if (content) news.content = content;
    if (tags) news.tags = tags;
    if (featuredImage) news.featuredImage = featuredImage;

    if (status && news.status !== status) {
        news.status = status;
        news.publishedAt = status === 'published' ? new Date() : null;
    }

    const updatedNews = await news.save();

    res.status(200).json({ success: true, data: updatedNews });
});

export const deleteNews = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const news = await News.findById(id);

    if (!news) {
        res.status(404);
        throw new Error('News article not found');
    }

    if (news.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Not authorized to delete this news article');
    }

    // Use deleteOne on document or model
    await news.deleteOne();  // instead of news.remove()

    res.status(200).json({ success: true, message: 'News article deleted' });
});
