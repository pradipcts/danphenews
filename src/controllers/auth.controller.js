import User from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { sendEmail } from '../utils/email.js';
import crypto from 'crypto';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
    try {
        const {
            name,
            email,
            password,
            role = 'reader', // default role
            profileImage = 'default-profile.jpg',
            bio = '',
            favoriteCategories = []
        } = req.body;

        // Create user in DB
        const user = await User.create({
            name,
            email,
            password,
            role,
            profileImage,
            bio,
            favoriteCategories
        });

        // Generate JWT token
        const token = generateToken(user._id, user.role);

        // Get public profile without sensitive info
        const safeUser = user.getPublicProfile();

        res.status(201).json({
            success: true,
            token,
            data: safeUser
        });
    } catch (err) {
        next(err);
    }
};


// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user including password for verification
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: `Account is ${user.status}`,
            });
        }

        user.lastLogin = Date.now();
        await user.save();

        // Generate JWT token with user id, role, and any other info you want
        const token = generateToken(user);

        // Set token cookie (httpOnly for security)
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // example
        });

        // Set role cookie (accessible by frontend, so not httpOnly)
        res.cookie('role', user.role, {
            httpOnly: false,
            secure: config.auth.cookieOptions.secure,
            sameSite: config.auth.cookieOptions.sameSite,
            maxAge: config.auth.cookieOptions.maxAge,
        });

        // Respond with user data and token
        res.status(200).json({
            success: true,
            data: {
                ...user.getPublicProfile(),
                token // Include the token in the response
            }
        });
    } catch (err) {
        next(err);
    }
};

// Generate Token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            role: user.role,
            email: user.email,
            name: user.name,
        },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn } // Consider adding expiration
    );
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).populate('favoriteCategories');

        res.status(200).json({
            success: true,
            data: user.getPublicProfile(),
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with that email',
            });
        }

        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // Send email
        const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/resetpassword/${resetToken}`;

        const message = `You are receiving this email because you (or someone else) has requested a password reset. Please make a PUT request to: \n\n ${resetUrl}`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password reset token',
                message,
            });

            res.status(200).json({
                success: true,
                message: 'Token sent to email',
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                success: false,
                message: 'Email could not be sent',
            });
        }
    } catch (err) {
        next(err);
    }
};

// @desc    Reset password
// @route   PUT /api/v1/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
    try {
        // Get hashed token
        const resetToken = crypto
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: resetToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token is invalid or has expired',
            });
        }

        // Set new password
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Generate token
        const token = generateToken(user._id, user.role);

        res.status(200).json({
            success: true,
            token,
            data: user.getPublicProfile(),
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
export const updateDetails = async (req, res, next) => {
    try {
        const fieldsToUpdate = {
            name: req.body.name,
            email: req.body.email,
        };

        const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            data: user.getPublicProfile(),
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('+password');

        // Check current password
        if (!(await user.matchPassword(req.body.currentPassword))) {
            return res.status(401).json({
                success: false,
                message: 'Password is incorrect',
            });
        }

        user.password = req.body.newPassword;
        await user.save();

        // Generate token
        const token = generateToken(user._id, user.role);

        res.status(200).json({
            success: true,
            token,
            data: user.getPublicProfile(),
        });
    } catch (err) {
        next(err);
    }
};

// @desc    Logout user
// @route   GET /api/v1/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
    try {
        // In a JWT system, logout is handled client-side by removing the token
        // This endpoint can be used for server-side cleanup if needed

        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (err) {
        next(err);
    }
};