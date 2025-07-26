import multer from 'multer';
import { storage } from '../utils/cloudinary.js';

const upload = multer({ storage });
const uploadImage = upload.single('image');

export const handleImageUpload = (req, res, next) => {
    console.log('[Upload] Initiating image upload...');

    uploadImage(req, res, (err) => {
        if (err) {
            console.error('[Upload Error]', err.message);
            return res.status(400).json({
                success: false,
                error: 'Upload failed',
                message: err.message
            });
        }

        // ✅ No file? It's okay. Just move on
        if (!req.file) {
            console.log('[Upload] No image uploaded. Continuing without image.');
            return next(); // don't respond, just continue to next handler
        }

        const { originalname, mimetype, size, path: filePath } = req.file;
        console.log('[Upload] ✅ Image uploaded successfully:');
        console.log(`- Name: ${originalname}`);
        console.log(`- Type: ${mimetype}`);
        console.log(`- Size: ${(size / 1024).toFixed(2)} KB`);
        console.log(`- Cloudinary URL: ${filePath}`);

        req.imageUrl = filePath;
        next();
    });
};
