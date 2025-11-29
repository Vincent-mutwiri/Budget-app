import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

/**
 * Generate a TOTP secret for MFA
 */
export function generateTOTPSecret(email: string): { secret: string; otpauthUrl: string } {
    const secret = speakeasy.generateSecret({
        name: `SmartWallet (${email})`,
        issuer: 'SmartWallet',
        length: 32
    });

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url || ''
    };
}

/**
 * Generate QR code for authenticator app setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        return qrCodeDataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code');
    }
}

/**
 * Verify TOTP code
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps before and after for clock skew
    });
}

/**
 * Generate backup codes for MFA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }

    return codes;
}

/**
 * Hash backup codes for secure storage
 */
export function hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify backup code against hashed codes
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
    const hashedInput = hashBackupCode(code);
    return hashedCodes.includes(hashedInput);
}

/**
 * Generate a random 6-digit code for email/SMS verification
 */
export function generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send email verification code (placeholder - integrate with email service)
 */
export async function sendEmailVerificationCode(email: string, code: string): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`Sending verification code ${code} to ${email}`);

    // For now, just log the code
    // In production, this would send an actual email
}

/**
 * Send SMS verification code (placeholder - integrate with SMS service)
 */
export async function sendSMSVerificationCode(phoneNumber: string, code: string): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`Sending verification code ${code} to ${phoneNumber}`);

    // For now, just log the code
    // In production, this would send an actual SMS
}
