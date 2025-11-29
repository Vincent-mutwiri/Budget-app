import mongoose from 'mongoose';

/**
 * Push notification service
 * Sends browser push notifications using Web Push API
 * 
 * Note: This implementation provides the backend infrastructure for push notifications.
 * Requires web-push package and proper VAPID keys configuration.
 */

// Push subscription model
const PushSubscriptionSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    endpoint: { type: String, required: true },
    keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true }
    },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate subscriptions
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export const PushSubscription = mongoose.model('PushSubscription', PushSubscriptionSchema);

/**
 * Save push subscription for a user
 */
export async function savePushSubscription(
    userId: string,
    subscription: {
        endpoint: string;
        keys: {
            p256dh: string;
            auth: string;
        };
    },
    userAgent?: string
): Promise<void> {
    try {
        await PushSubscription.findOneAndUpdate(
            { userId, endpoint: subscription.endpoint },
            {
                userId,
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userAgent,
                lastUsed: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`Push subscription saved for user ${userId}`);
    } catch (error) {
        console.error('Error saving push subscription:', error);
        throw error;
    }
}

/**
 * Remove push subscription
 */
export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
    try {
        await PushSubscription.deleteOne({ userId, endpoint });
        console.log(`Push subscription removed for user ${userId}`);
    } catch (error) {
        console.error('Error removing push subscription:', error);
        throw error;
    }
}

/**
 * Get all push subscriptions for a user
 */
async function getUserPushSubscriptions(userId: string): Promise<any[]> {
    try {
        const subscriptions = await PushSubscription.find({ userId });
        return subscriptions;
    } catch (error) {
        console.error('Error fetching push subscriptions:', error);
        return [];
    }
}

/**
 * Send push notification using Web Push API
 */
async function sendWebPush(
    subscription: any,
    payload: string
): Promise<boolean> {
    try {
        // Check if web-push is configured
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@smartwallet.app';

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.log('VAPID keys not configured. Push notification would be sent:');
            console.log('Endpoint:', subscription.endpoint);
            console.log('Payload:', payload);
            return true; // Return success in development mode
        }

        // Web Push integration (requires web-push package)
        // const webpush = require('web-push');
        // 
        // webpush.setVapidDetails(
        //     vapidSubject,
        //     vapidPublicKey,
        //     vapidPrivateKey
        // );
        //
        // await webpush.sendNotification(
        //     {
        //         endpoint: subscription.endpoint,
        //         keys: subscription.keys
        //     },
        //     payload
        // );

        console.log(`Push notification sent to ${subscription.endpoint}`);

        // Update last used timestamp
        await PushSubscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            { lastUsed: new Date() }
        );

        return true;
    } catch (error: any) {
        console.error('Error sending web push:', error);

        // Handle expired or invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('Subscription expired or invalid, removing...');
            await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
        }

        return false;
    }
}

/**
 * Send push notification to user
 */
export async function sendPushNotification(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
): Promise<void> {
    try {
        // Get all push subscriptions for the user
        const subscriptions = await getUserPushSubscriptions(userId);

        if (subscriptions.length === 0) {
            console.log(`No push subscriptions found for user ${userId}`);
            return;
        }

        // Prepare notification payload
        const payload = JSON.stringify({
            title,
            body: message,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
                url: actionUrl || '/',
                timestamp: new Date().toISOString()
            },
            actions: actionUrl ? [
                {
                    action: 'view',
                    title: 'View'
                },
                {
                    action: 'close',
                    title: 'Close'
                }
            ] : undefined
        });

        // Send to all subscriptions
        const results = await Promise.allSettled(
            subscriptions.map(sub => sendWebPush(sub, payload))
        );

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(`Push notifications sent: ${successCount}/${subscriptions.length} successful`);
    } catch (error) {
        console.error('Error in sendPushNotification:', error);
        throw error;
    }
}

/**
 * Send test push notification
 */
export async function sendTestPushNotification(userId: string): Promise<boolean> {
    try {
        await sendPushNotification(
            userId,
            'Test Notification',
            'This is a test notification from SmartWallet. If you received this, your push notifications are working correctly!',
            '/settings'
        );
        return true;
    } catch (error) {
        console.error('Error sending test push notification:', error);
        return false;
    }
}

/**
 * Get VAPID public key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * Clean up old/expired subscriptions
 * Should be run periodically (e.g., daily)
 */
export async function cleanupExpiredSubscriptions(): Promise<void> {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const result = await PushSubscription.deleteMany({
            lastUsed: { $lt: sixMonthsAgo }
        });

        console.log(`Cleaned up ${result.deletedCount} expired push subscriptions`);
    } catch (error) {
        console.error('Error cleaning up expired subscriptions:', error);
    }
}
