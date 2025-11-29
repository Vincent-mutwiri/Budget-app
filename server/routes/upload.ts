import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';

const router = express.Router();

// Initialize S3 Client
const s3 = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

// Configure Multer S3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME || '',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'uploads/' + uniqueSuffix + path.extname(file.originalname));
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Upload Route
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // Type assertion for multer-s3 file object
    const file = req.file as any;

    res.json({
        message: 'File uploaded successfully',
        url: file.location, // S3 URL
        key: file.key
    });
});

export default router;
