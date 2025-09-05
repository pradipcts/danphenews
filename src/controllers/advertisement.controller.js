import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import asyncHandler from '../middlewares/async.js';
import Advertisement from '../models/advertisement.model.js';
import ErrorResponse from '../utils/errorResponse.js';

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
// ✅ Create a new advertisement (with optional image upload)
export const createAdvertisement = asyncHandler(async (req, res, next) => {
    console.log('[CREATE AD] Headers:', req.headers);
    console.log('[CREATE AD] Body:', req.body);
    console.log('[CREATE AD] File:', req.file);

    // Validate required fields
    const { title, url, position, startDate, endDate, isActive } = req.body;
    if (!title || !url || !position || !startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: title, url, position, startDate, or endDate',
        });
    }

    // Handle image upload
    let imageUrl = '';
    if (req.file) {
        imageUrl = req.file.path; // Cloudinary image URL or local path
        console.log('[CREATE AD] Image URL:', imageUrl);
    } else {
        return res.status(400).json({
            success: false,
            message: 'Image is required',
        });
    }

    // =====================
    // Extract token (cookies first, then Authorization header)
    // =====================
    let createdBy = 'anonymous'; // default if no token
    let token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwtSecret);
            createdBy = decoded.id; // assuming JWT payload has user id
            console.log('[CREATE AD] Authenticated user:', createdBy);
        } catch (err) {
            console.warn('[CREATE AD] Invalid token, proceeding as anonymous');
        }
    }

    // Prepare advertisement data
    const advertisementData = {
        title,
        url,
        position,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive === 'true' || isActive === true,
        image: imageUrl,
        createdBy,
    };

    try {
        const advertisement = await Advertisement.create(advertisementData);
        console.log('[CREATE AD] Created advertisement:', advertisement);

        res.status(201).json({
            success: true,
            data: advertisement,
        });
    } catch (err) {
        console.error('[CREATE AD] Error:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create advertisement',
            error: err.message,
        });
    }
});


// ✅ Update advertisement (with optional image replacement)
export const updateAdvertisement = asyncHandler(async (req, res, next) => {
    const { adId } = req.params;

    // Validate advertisement ID
    if (!mongoose.Types.ObjectId.isValid(adId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid advertisement ID format'
        });
    }

    try {
        // Find the existing advertisement
        const existingAd = await Advertisement.findById(adId);
        if (!existingAd) {
            return res.status(404).json({
                success: false,
                message: 'Advertisement not found'
            });
        }

        // Process the update data
        const updateData = {
            title: req.body.title,
            url: req.body.url,
            position: req.body.position,
            startDate: new Date(req.body.startDate),
            endDate: new Date(req.body.endDate),
            isActive: req.body.isActive === 'true'
        };

        // Handle image upload if new image was provided
        if (req.file) {
            // Upload new image to Cloudinary (or your storage service)
            const uploadResult = await uploadToCloudinary(req.file.path);
            updateData.image = uploadResult.secure_url;

            // Optional: Delete old image from storage
            // await deleteFromCloudinary(existingAd.image);
        }

        // Update the advertisement
        const updatedAd = await Advertisement.findByIdAndUpdate(
            adId,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Advertisement updated successfully',
            data: updatedAd
        });

    } catch (error) {
        console.error('[UPDATE AD] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update advertisement',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// ✅ Delete advertisement
export const deleteAdvertisement = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    // Validate the ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid advertisement ID format'
        });
    }

    try {
        // OPTION 1: Using find + deleteOne (better for pre-delete logic)
        const advertisement = await Advertisement.findById(id);

        if (!advertisement) {
            return res.status(404).json({
                success: false,
                message: 'Advertisement not found'
            });
        }

        await advertisement.deleteOne(); // Fixed: Using deleteOne instead of remove

        // OPTION 2: Using findByIdAndDelete (more concise)
        // const result = await Advertisement.findByIdAndDelete(id);
        // if (!result) {
        //     return res.status(404).json({
        //         success: false,
        //         message: 'Advertisement not found'
        //     });
        // }

        res.status(200).json({
            success: true,
            message: 'Advertisement deleted successfully'
        });

    } catch (error) {
        console.error('[DELETE AD] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete advertisement',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
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
