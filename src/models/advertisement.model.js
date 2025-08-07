import mongoose from 'mongoose';

const advertisementSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a title for the advertisement'],
            trim: true,
            maxlength: [100, 'Title cannot be more than 100 characters'],
        },
        image: {
            type: String,
            required: [true, 'Please upload an image for the advertisement'],
        },
        url: {
            type: String,
            required: [true, 'Please provide a target URL for the advertisement'],
            match: [
                /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                'Please provide a valid URL',
            ],
        },
        position: {
            type: String,
            required: [true, 'Please specify the ad position'],
            enum: [
                'header',
                'sidebar',
                'footer',
                'in-article',
                'popup',
                'homepage-banner',
            ],
        },
        startDate: {
            type: Date,
            required: [true, 'Please provide a start date'],
        },
        endDate: {
            type: Date,
            required: [true, 'Please provide an end date'],
            validate: {
                validator: function (value) {
                    return value > this.startDate;
                },
                message: 'End date must be after start date',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        clicks: {
            type: Number,
            default: 0,
        },
        impressions: {
            type: Number,
            default: 0,
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Index for active ads in a position
advertisementSchema.index({ position: 1, isActive: 1 });

const Advertisement = mongoose.model('Advertisement', advertisementSchema);

export default Advertisement;