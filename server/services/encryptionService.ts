import * as crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get encryption key from environment variable
 * In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Ensure key is 32 bytes (256 bits)
    return crypto.scryptSync(key, 'salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data
 */
export function encrypt(plaintext: string): string {
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Combine IV + authTag + encrypted data
        const combined = Buffer.concat([
            iv,
            authTag,
            Buffer.from(encrypted, 'hex')
        ]);

        return combined.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedData: string): string {
    try {
        const key = getEncryptionKey();
        const combined = Buffer.from(encryptedData, 'base64');

        // Extract IV, authTag, and encrypted data
        const iv = combined.subarray(0, IV_LENGTH);
        const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
        const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Encrypt sensitive fields in an object
 */
export function encryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
): T {
    const encrypted = { ...obj };

    for (const field of fieldsToEncrypt) {
        if (encrypted[field] !== undefined && encrypted[field] !== null) {
            const value = String(encrypted[field]);
            encrypted[field] = encrypt(value) as any;
        }
    }

    return encrypted;
}

/**
 * Decrypt sensitive fields in an object
 */
export function decryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[]
): T {
    const decrypted = { ...obj };

    for (const field of fieldsToDecrypt) {
        if (decrypted[field] !== undefined && decrypted[field] !== null) {
            try {
                const value = String(decrypted[field]);
                decrypted[field] = decrypt(value) as any;
            } catch (error) {
                console.error(`Failed to decrypt field ${String(field)}:`, error);
                // Keep original value if decryption fails
            }
        }
    }

    return decrypted;
}

/**
 * Hash password using bcrypt-like approach with crypto
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
    try {
        const [salt, originalHash] = hashedPassword.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return hash === originalHash;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generate a new encryption key (for key rotation)
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Rotate encryption key (re-encrypt data with new key)
 * This is a placeholder - actual implementation would need to:
 * 1. Decrypt all sensitive data with old key
 * 2. Encrypt with new key
 * 3. Update all records in database
 */
export async function rotateEncryptionKey(oldKey: string, newKey: string): Promise<void> {
    // TODO: Implement key rotation logic
    console.log('Key rotation initiated');
    throw new Error('Key rotation not yet implemented');
}
