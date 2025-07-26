import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// ✅ Config Cloudinary environment
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Export storage for multer
export const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const originalName = file.originalname || 'image';
        const cleanName = originalName.split('.')[0].replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
        const timestamp = Date.now();
        return {
            folder: 'news_images',
            format: file.mimetype.split('/')[1], // e.g. 'png'
            public_id: `${cleanName}-${timestamp}`,
        };
    }
});
