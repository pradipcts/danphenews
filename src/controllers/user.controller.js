import User from '../models/user.model.js';
import asyncHandler from 'express-async-handler'; // ✅ Use official async handler
import ErrorResponse from '../utils/errorResponse.js';

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
    console.log('🔹 Fetching all users...');
    const users = await User.find().select('-password'); // exclude password
    console.log(`✅ Found ${users.length} users`);

    res.status(200).json({
        success: true,
        count: users.length,
        data: users,
    });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
export const getUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).populate('favoriteCategories');

    if (!user) {
        return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: user.getPublicProfile(),
    });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (user or admin)
export const updateUser = asyncHandler(async (req, res, next) => {
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
        return next(new ErrorResponse('Not authorized to update this user', 401));
    }

    const fieldsToUpdate = {
        name: req.body.name,
        email: req.body.email,
        bio: req.body.bio,
        profileImage: req.body.profileImage,
    };

    if (req.body.role && req.user.role === 'admin') {
        fieldsToUpdate.role = req.body.role;
    }

    if (req.body.status && req.user.role === 'admin') {
        fieldsToUpdate.status = req.body.status;
    }

    const user = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
        new: true,
        runValidators: true,
    });

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: user.getPublicProfile(),
    });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
        success: true,
        data: {},
    });
});

// @desc    Update favorite categories
// @route   PUT /api/v1/users/favorites
// @access  Private
export const updateFavoriteCategories = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(
        req.user.id,
        { favoriteCategories: req.body.categories },
        { new: true }
    ).populate('favoriteCategories');

    if (!user) {
        return next(new ErrorResponse('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: user.favoriteCategories,
    });
});

// @desc    Get user statistics
// @route   GET /api/v1/users/stats
// @access  Private/Admin
export const getUserStats = asyncHandler(async (req, res) => {
    const stats = await User.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        data: stats,
    });
});
