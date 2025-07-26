import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
            maxlength: [50, 'Name cannot be more than 50 characters']
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email'
            ]
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false
        },
        role: {
            type: String,
            enum: ['reader', 'author', 'editor', 'admin'],
            default: 'reader'
        },
        profileImage: {
            type: String,
            default: 'default-profile.jpg'
        },
        bio: {
            type: String,
            maxlength: [500, 'Bio cannot be more than 500 characters'],
            default: ''
        },
        favoriteCategories: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        isVerified: {
            type: Boolean,
            default: false
        },
        lastLogin: {
            type: Date
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'banned'],
            default: 'active'
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// Virtual for getting user's articles
userSchema.virtual('articles', {
    ref: 'Article',
    localField: '_id',
    foreignField: 'author',
    justOne: false
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get public profile (without sensitive info)
userSchema.methods.getPublicProfile = function () {
    const user = this.toObject();
    delete user.password;
    delete user.__v;
    return user;
};

const User = mongoose.model('User', userSchema);

export default User;