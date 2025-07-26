import User from '../models/user.model.js';
import ApiResponse from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn
    });
};

const registerUser = async (userData) => {
    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
        throw new Error('User already exists with this email');
    }

    // Create user
    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    return new ApiResponse({
        statusCode: 201,
        data: { user, token }
    });
};

const loginUser = async (email, password) => {
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    return new ApiResponse({
        data: { user, token }
    });
};

export default {
    registerUser,
    loginUser
};