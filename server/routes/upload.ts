import express from 'express';
import multer from 'multer';
import { uploadImageToS3, validateImageType } from '../services/imageService';

const router = express.Router();

// Configure Multer to use memory storage for validation before S3 upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Validate file type
        if (validateImageType(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, JPEG, PNG, and WEBP files are allowed.'));
        }
    }
});

// Upload Route with enhanced validation
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                errorCode: 'NO_FILE'
            });
        }

        // Upload to S3 with validation
        const result = await uploadImageToS3(req.file, 'uploads');

        if (!result.success) {
            return res.status(400).json({
                error: result.error,
                errorCode: result.errorCode
            });
        }

        res.json({
            message: 'File uploaded successfully',
            url: result.imageUrl,
            key: result.key
        });
    } catch (error) {
        console.error('Error in upload route:', error);
        res.status(500).json({
            error: 'Failed to upload file',
            errorCode: 'UPLOAD_ERROR'
        });
    }
});

export default router;
