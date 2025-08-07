import Advertisement from '../models/advertisement.model.js';
import ErrorResponse from '../utils/errorResponse.js';
import asyncHandler from '../middlewares/async.js';
import jwt from 'jsonwebtoken';

// ✅ Get all advertisements
export const getAdvertisements = asyncHandler(async (req, res, next) => {
    res.status(200).json(res.advancedResults);
});

// ✅ Get a single advertisement by ID
export const getAdvertisement = asyncHandler(async (req, res, next) => {
    const advertisement = await Advertisement.findById(req.params.id).populate({
        path: 'createdBy',
        select: 'name email',
    });

    if (!advertisement) {
        return next(
            new ErrorResponse(`Advertisement not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: advertisement,
    });
});

// ✅ Create a new advertisement (with optional image upload)
export const createAdvertisement = asyncHandler(async (req, res, next) => {
    console.log('[CREATE AD] Body:', req.body);
    console.log('[CREATE AD] File:', req.file);

    let imageUrl = '';
    if (req.file) {
        imageUrl = req.file.path; // Cloudinary image URL
    }

    const token = req.cookies.token;
    console.log('[CREATE AD] Token from cookies:', token);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication token not found in cookies.',
        });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('[CREATE AD] Decoded token:', decoded);
    } catch (err) {
        console.error('[CREATE AD] JWT verification error:', err.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired authentication token.',
            error: err.message,
        });
    }

    const userId = decoded.id || decoded.userId;
    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token payload. User ID missing.',
        });
    }

    req.body.createdBy = userId;
    req.body.image = imageUrl;

    const advertisement = await Advertisement.create(req.body);

    res.status(201).json({
        success: true,
        data: advertisement,
    });
});

// ✅ Update advertisement (with optional image replacement)
export const updateAdvertisement = asyncHandler(async (req, res, next) => {
    console.log('[UPDATE AD] Params:', req.params);
    console.log('[UPDATE AD] Body:', req.body);
    console.log('[UPDATE AD] File:', req.file);

    // Find the existing advertisement
    let advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
        return next(
            new ErrorResponse(`Advertisement not found with id of ${req.params.id}`, 404)
        );
    }

    // Authorization check (assumes req.user is set)
    if (
        advertisement.createdBy.toString() !== req.user.id &&
        req.user.role !== 'admin'
    ) {
        return next(
            new ErrorResponse(`User ${req.user.id} is not authorized to update this advertisement`, 403)
        );
    }

    // Update fields manually
    if (req.body.title !== undefined) advertisement.title = req.body.title;
    if (req.body.url !== undefined) advertisement.url = req.body.url;
    if (req.body.position !== undefined) advertisement.position = req.body.position;
    if (req.body.startDate !== undefined) advertisement.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) advertisement.endDate = new Date(req.body.endDate);

    if (req.file) {
        advertisement.image = req.file.path; // Cloudinary image URL
    }

    // Save document — runs all validators properly
    await advertisement.save();

    res.status(200).json({
        success: true,
        data: advertisement,
    });
});


// ✅ Delete advertisement
export const deleteAdvertisement = asyncHandler(async (req, res, next) => {
    const advertisement = await Advertisement.findById(req.params.id);

    if (!advertisement) {
        return next(
            new ErrorResponse(`Advertisement not found with id of ${req.params.id}`, 404)
        );
    }

    if (
        advertisement.createdBy.toString() !== req.user.id &&
        req.user.role !== 'admin'
    ) {
        return next(
            new ErrorResponse(`User ${req.user.id} is not authorized to delete this advertisement`, 401)
        );
    }

    // Use deleteOne instead of remove()
    await advertisement.deleteOne();

    res.status(200).json({
        success: true,
        data: {},
    });
});


// ✅ Get all currently active ads by position
export const getAdsByPosition = asyncHandler(async (req, res, next) => {
    const { position } = req.params;
    const currentDate = new Date();

    const ads = await Advertisement.find({
        position,
        isActive: true,
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate },
    }).select('title image url position');

    // Optional: track impressions
    await Advertisement.updateMany(
        { _id: { $in: ads.map(ad => ad._id) } },
        { $inc: { impressions: 1 } }
    );

    res.status(200).json({
        success: true,
        count: ads.length,
        data: ads,
    });
});

// ✅ Record a click on an ad
export const recordAdClick = asyncHandler(async (req, res, next) => {
    const advertisement = await Advertisement.findByIdAndUpdate(
        req.params.id,
        { $inc: { clicks: 1 } },
        { new: true }
    );

    if (!advertisement) {
        return next(
            new ErrorResponse(`Advertisement not found with id of ${req.params.id}`, 404)
        );
    }

    res.status(200).json({
        success: true,
        data: advertisement,
    });
});
