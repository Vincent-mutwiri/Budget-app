import express from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import { Receipt } from '../models/Receipt';
import { processReceiptOCR, isOCRAvailable } from '../services/ocrService';

const router = express.Router();

// Initialize S3 Client
const s3 = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

// Configure Multer S3 for receipt uploads
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME || '',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'receipts/' + uniqueSuffix + path.extname(file.originalname));
        },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept only image files and PDFs
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
        }
    }
});

/**
 * POST /api/receipts/upload
 * Upload receipt image and create receipt record
 */
router.post('/upload', upload.single('receipt'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'UserId is required' });
        }

        // Type assertion for multer-s3 file object
        const file = req.file as any;
        const imageUrl = file.location; // S3 URL

        // Create receipt record in database
        const receipt = new Receipt({
            userId,
            imageUrl,
            extractedData: {
                merchantName: '',
                date: '',
                totalAmount: 0,
                lineItems: []
            },
            confidence: {
                merchantName: 0,
                date: 0,
                totalAmount: 0
            },
            ocrStatus: 'pending',
            createdAt: new Date()
        });

        await receipt.save();

        res.status(201).json({
            message: 'Receipt uploaded successfully',
            receipt: {
                id: receipt._id,
                userId: receipt.userId,
                imageUrl: receipt.imageUrl,
                ocrStatus: receipt.ocrStatus,
                createdAt: receipt.createdAt
            }
        });
    } catch (error) {
        console.error('Error uploading receipt:', error);
        res.status(500).json({ error: 'Failed to upload receipt' });
    }
});

/**
 * POST /api/receipts/:id/process
 * Trigger OCR processing for a receipt
 */
router.post('/:id/process', async (req, res) => {
    try {
        const { id } = req.params;

        // Find the receipt
        const receipt = await Receipt.findById(id);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        // Check if OCR is available
        if (!isOCRAvailable()) {
            return res.status(503).json({
                error: 'OCR service is not configured',
                message: 'Please configure Google Vision API credentials to enable OCR processing'
            });
        }

        // Check if already processing or completed
        if (receipt.ocrStatus === 'processing') {
            return res.status(409).json({ error: 'Receipt is already being processed' });
        }

        if (receipt.ocrStatus === 'completed') {
            return res.status(200).json({
                message: 'Receipt has already been processed',
                receipt
            });
        }

        // Update status to processing
        receipt.ocrStatus = 'processing';
        await receipt.save();

        // Process OCR asynchronously
        processReceiptOCR(receipt.imageUrl)
            .then(async (extractedData) => {
                // Update receipt with extracted data
                if (receipt.extractedData) {
                    receipt.extractedData.merchantName = extractedData.merchantName;
                    receipt.extractedData.date = extractedData.date;
                    receipt.extractedData.totalAmount = extractedData.totalAmount;
                    receipt.extractedData.lineItems = extractedData.lineItems as any;
                }
                if (receipt.confidence) {
                    receipt.confidence.merchantName = extractedData.confidence.merchantName;
                    receipt.confidence.date = extractedData.confidence.date;
                    receipt.confidence.totalAmount = extractedData.confidence.totalAmount;
                }
                receipt.ocrStatus = 'completed';
                await receipt.save();

                console.log(`Receipt ${id} processed successfully`);
            })
            .catch(async (error) => {
                console.error(`Error processing receipt ${id}:`, error);
                receipt.ocrStatus = 'failed';
                await receipt.save();
            });

        res.json({
            message: 'OCR processing started',
            receiptId: receipt._id,
            status: 'processing'
        });
    } catch (error) {
        console.error('Error triggering OCR processing:', error);
        res.status(500).json({ error: 'Failed to process receipt' });
    }
});

/**
 * GET /api/receipts/:id
 * Get receipt with extracted data
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const receipt = await Receipt.findById(id);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        res.json(receipt);
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

/**
 * GET /api/receipts
 * Get all receipts for a user
 */
router.get('/', async (req, res) => {
    try {
        const { userId, status, limit = '50' } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'UserId is required' });
        }

        const query: any = { userId };

        if (status) {
            query.ocrStatus = status;
        }

        const receipts = await Receipt.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string));

        res.json(receipts);
    } catch (error) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

/**
 * DELETE /api/receipts/:id
 * Delete a receipt
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const receipt = await Receipt.findByIdAndDelete(id);

        if (!receipt) {
            return res.status(404).json({ error: 'Receipt not found' });
        }

        res.json({
            message: 'Receipt deleted successfully',
            id
        });
    } catch (error) {
        console.error('Error deleting receipt:', error);
        res.status(500).json({ error: 'Failed to delete receipt' });
    }
});

export default router;
