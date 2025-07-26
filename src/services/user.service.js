import User from '../models/user.model.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @description Get all users
 * @route GET /api/v1/users
 * @access Private/Admin
 */
const getAllUsers = asyncHandler(async (filter = {}, options = {}) => {
    const { page = 1, limit = 10, sort = '-createdAt' } = options;
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-password');

    const total = await User.countDocuments(filter);

    return new ApiResponse({
        results: users.length,
        total,
        data: users,
    });
});

/**
 * @description Get single user
 * @route GET /api/v1/users/:id
 * @access Private/Admin
 */
const getUserById = asyncHandler(async (userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) {
        throw new Error('User not found');
    }
    return new ApiResponse({ data: user });
});

export default {
    getAllUsers,
    getUserById,
    // Add other service methods...
};