import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import * as path from 'path';

// Initialize S3 Client
const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface ImageUploadResult {
    success: boolean;
    imageUrl?: string;
    key?: string;
    error?: string;
    errorCode?: string;
}

export interface ImageDeleteResult {
    success: boolean;
    error?: string;
}

/**
 * Validate image file type
 */
export function validateImageType(mimetype: string): boolean {
    return ALLOWED_IMAGE_TYPES.includes(mimetype.toLowerCase());
}

/**
 * Validate image file size
 */
export function validateImageSize(size: number): boolean {
    return size <= MAX_FILE_SIZE;
}

/**
 * Generate unique filename for image upload
 */
export function generateUniqueFilename(originalFilename: string, prefix: string = 'images'): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalFilename).toLowerCase();
    return `${prefix}/${timestamp}-${randomString}${extension}`;
}

/**
 * Upload image to S3 with validation
 */
export async function uploadImageToS3(
    file: Express.Multer.File,
    prefix: string = 'images'
): Promise<ImageUploadResult> {
    try {
        // Validate file type
        if (!validateImageType(file.mimetype)) {
            return {
                success: false,
                error: 'Invalid file type. Only JPG, JPEG, PNG, and WEBP files are allowed.',
                errorCode: 'INVALID_FILE_TYPE'
            };
        }

        // Validate file size
        if (!validateImageSize(file.size)) {
            return {
                success: false,
                error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
                errorCode: 'FILE_TOO_LARGE'
            };
        }

        // Generate unique filename
        const key = generateUniqueFilename(file.originalname, prefix);

        // Upload to S3
        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || '',
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read', // Make the image publicly accessible
        });

        await s3Client.send(uploadCommand);

        // Construct the image URL
        const imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;

        return {
            success: true,
            imageUrl,
            key
        };
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        return {
            success: false,
            error: 'Failed to upload image to storage.',
            errorCode: 'UPLOAD_FAILED'
        };
    }
}

/**
 * Extract S3 key from image URL
 */
export function extractS3KeyFromUrl(imageUrl: string): string | null {
    try {
        // Handle URLs in format: https://bucket.s3.region.amazonaws.com/key
        // or https://s3.region.amazonaws.com/bucket/key
        const url = new URL(imageUrl);

        // Remove leading slash from pathname
        const key = url.pathname.substring(1);

        if (!key) {
            return null;
        }

        return key;
    } catch (error) {
        console.error('Error extracting S3 key from URL:', error);
        return null;
    }
}

/**
 * Delete image from S3
 */
export async function deleteImageFromS3(imageUrl: string): Promise<ImageDeleteResult> {
    try {
        // Check if URL is an S3 URL
        if (!imageUrl || !imageUrl.includes('amazonaws.com')) {
            return {
                success: false,
                error: 'Invalid S3 URL'
            };
        }

        // Extract S3 key from URL
        const key = extractS3KeyFromUrl(imageUrl);

        if (!key) {
            return {
                success: false,
                error: 'Could not extract S3 key from URL'
            };
        }

        // Delete from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME || '',
            Key: key,
        });

        await s3Client.send(deleteCommand);

        return {
            success: true
        };
    } catch (error) {
        console.error('Error deleting image from S3:', error);
        return {
            success: false,
            error: 'Failed to delete image from storage'
        };
    }
}

/**
 * Validate image buffer (for direct buffer uploads)
 */
export function validateImageBuffer(buffer: Buffer, mimetype: string): { valid: boolean; error?: string; errorCode?: string } {
    // Validate file type
    if (!validateImageType(mimetype)) {
        return {
            valid: false,
            error: 'Invalid file type. Only JPG, JPEG, PNG, and WEBP files are allowed.',
            errorCode: 'INVALID_FILE_TYPE'
        };
    }

    // Validate file size
    if (!validateImageSize(buffer.length)) {
        return {
            valid: false,
            error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
            errorCode: 'FILE_TOO_LARGE'
        };
    }

    return { valid: true };
}

/**
 * Get S3 client instance (for advanced usage)
 */
export function getS3Client(): S3Client {
    return s3Client;
}
