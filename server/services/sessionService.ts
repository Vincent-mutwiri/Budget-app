import * as crypto from 'crypto';
import { UserSession } from '../models/UserSession';

const SESSION_TIMEOUT_MINUTES = 30;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

/**
 * Create a new user session
 */
export async function createSession(
    userId: string,
    deviceInfo: { browser: string; os: string; ip: string }
): Promise<string> {
    try {
        // Generate unique session token
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

        // Create session record
        const session = new UserSession({
            userId,
            sessionToken,
            deviceInfo,
            createdAt: new Date(),
            lastActivity: new Date(),
            isActive: true,
            expiresAt
        });

        await session.save();

        return sessionToken;
    } catch (error) {
        console.error('Error creating session:', error);
        throw new Error('Failed to create session');
    }
}

/**
 * Validate and refresh session
 */
export async function validateSession(sessionToken: string): Promise<{
    isValid: boolean;
    userId?: string;
    session?: any;
}> {
    try {
        const session = await UserSession.findOne({
            sessionToken,
            isActive: true
        });

        if (!session) {
            return { isValid: false };
        }

        // Check if session has expired
        if (session.expiresAt < new Date()) {
            session.isActive = false;
            await session.save();
            return { isValid: false };
        }

        // Check for inactivity timeout
        const inactivityTime = Date.now() - session.lastActivity.getTime();
        if (inactivityTime > SESSION_TIMEOUT_MS) {
            session.isActive = false;
            await session.save();
            return { isValid: false };
        }

        // Update last activity and extend expiration
        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);
        await session.save();

        return {
            isValid: true,
            userId: session.userId,
            session: session.toObject()
        };
    } catch (error) {
        console.error('Error validating session:', error);
        return { isValid: false };
    }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<any[]> {
    try {
        const sessions = await UserSession.find({
            userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).sort({ lastActivity: -1 });

        return sessions.map(session => ({
            id: session._id.toString(),
            userId: session.userId,
            deviceInfo: session.deviceInfo,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            isActive: session.isActive
        }));
    } catch (error) {
        console.error('Error fetching user sessions:', error);
        throw new Error('Failed to fetch sessions');
    }
}

/**
 * Logout a specific session
 */
export async function logoutSession(sessionId: string): Promise<boolean> {
    try {
        const session = await UserSession.findById(sessionId);

        if (!session) {
            return false;
        }

        session.isActive = false;
        await session.save();

        return true;
    } catch (error) {
        console.error('Error logging out session:', error);
        throw new Error('Failed to logout session');
    }
}

/**
 * Logout all sessions for a user
 */
export async function logoutAllSessions(userId: string): Promise<number> {
    try {
        const result = await UserSession.updateMany(
            { userId, isActive: true },
            { $set: { isActive: false } }
        );

        return result.modifiedCount;
    } catch (error) {
        console.error('Error logging out all sessions:', error);
        throw new Error('Failed to logout all sessions');
    }
}

/**
 * Clean up expired sessions (can be run as a cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
    try {
        const result = await UserSession.deleteMany({
            $or: [
                { expiresAt: { $lt: new Date() } },
                { isActive: false }
            ]
        });

        return result.deletedCount;
    } catch (error) {
        console.error('Error cleaning up expired sessions:', error);
        return 0;
    }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionToken: string): Promise<void> {
    try {
        await UserSession.findOneAndUpdate(
            { sessionToken, isActive: true },
            {
                $set: {
                    lastActivity: new Date(),
                    expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS)
                }
            }
        );
    } catch (error) {
        console.error('Error updating session activity:', error);
    }
}

/**
 * Parse device info from user agent
 */
export function parseDeviceInfo(userAgent: string, ip: string): {
    browser: string;
    os: string;
    ip: string;
} {
    // Simple user agent parsing (in production, use a library like ua-parser-js)
    let browser = 'Unknown';
    let os = 'Unknown';

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { browser, os, ip };
}
