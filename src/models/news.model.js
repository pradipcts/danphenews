import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a title'],
            trim: true,
            maxlength: [150, 'Title cannot be more than 150 characters'],
            unique: true
        },
        content: {
            type: String,
            required: [true, 'Please provide content for the news article'],
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'News must be associated with a user'],
        },
        viewsCount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        category: {
            type: String,
            required: [true, 'Please select a category'],
            enum: [
                'सबै',
                'राजनीति',
                'खेलकुद',
                'स्वास्थ्य',
                'विचार',
                'राष्ट्रिय',
                'अन्तराष्ट्रिय',
                'प्रदेश विशेष',
                'फोटो',
                'भिडियो',
                'विशेष कथा',
                'जीवनशैली',
                'साहित्य',
            ],
            lowercase: true,
            trim: true,
        },
        tags: [{
            type: String,
            trim: true,
        }],
        image: {
            type: String,
            default: ''
        },
        publishedAt: {
            type: Date,
            default: null,
        },
        commentsCount: {
            type: Number,
            default: 0,
        },
        slug: {
            type: String,
            lowercase: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

newsSchema.index({ category: 1, status: 1, publishedAt: -1 });

newsSchema.pre('save', function (next) {
    if (!this.slug && this.title) {
        let slug = this.title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!slug) {
            slug = `news-${Date.now()}`;
        }

        this.slug = slug;
    }
    next();
});

const News = mongoose.model('News', newsSchema);
export default News;
