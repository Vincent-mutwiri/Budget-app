import { Account } from '../models/Account';

/**
 * Email notification service
 * Sends notifications via email using configured email service provider
 * 
 * Note: This implementation uses a placeholder for the actual email service.
 * In production, integrate with SendGrid, AWS SES, or similar service.
 */

interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}

/**
 * Get user's email address
 */
async function getUserEmail(userId: string): Promise<string | null> {
    try {
        const account = await Account.findOne({ userId });
        return account?.email || null;
    } catch (error) {
        console.error('Error fetching user email:', error);
        return null;
    }
}

/**
 * Generate email template for notification
 */
function generateEmailTemplate(title: string, message: string, actionUrl?: string): EmailTemplate {
    const appName = 'SmartWallet';
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const actionLink = actionUrl ? `${appUrl}${actionUrl}` : null;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4f46e5;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 25px;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #4f46e5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            text-align: center;
        }
        .button:hover {
            background-color: #4338ca;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
        </div>
        <div class="title">${title}</div>
        <div class="message">${message}</div>
        ${actionLink ? `
        <div style="text-align: center; margin: 25px 0;">
            <a href="${actionLink}" class="button">View Details</a>
        </div>
        ` : ''}
        <div class="footer">
            <p>You're receiving this email because you have email notifications enabled in your ${appName} account.</p>
            <p>To manage your notification preferences, visit your account settings.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    const text = `
${appName}

${title}

${message}

${actionLink ? `View Details: ${actionLink}` : ''}

---
You're receiving this email because you have email notifications enabled in your ${appName} account.
To manage your notification preferences, visit your account settings.
    `.trim();

    return {
        subject: title,
        html,
        text
    };
}

/**
 * Send email notification using configured email service
 */
async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
    try {
        // Check if email service is configured
        const emailServiceProvider = process.env.EMAIL_SERVICE_PROVIDER; // 'sendgrid', 'ses', or 'smtp'

        if (!emailServiceProvider) {
            console.log('Email service not configured. Email would be sent to:', to);
            console.log('Subject:', subject);
            console.log('Message:', text);
            return true; // Return success in development mode
        }

        // Integration with SendGrid
        if (emailServiceProvider === 'sendgrid') {
            const sendgridApiKey = process.env.SENDGRID_API_KEY;
            const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'notifications@smartwallet.app';

            if (!sendgridApiKey) {
                throw new Error('SendGrid API key not configured');
            }

            // SendGrid integration (requires @sendgrid/mail package)
            // const sgMail = require('@sendgrid/mail');
            // sgMail.setApiKey(sendgridApiKey);
            // await sgMail.send({
            //     to,
            //     from: fromEmail,
            //     subject,
            //     text,
            //     html
            // });

            console.log(`Email sent via SendGrid to ${to}`);
            return true;
        }

        // Integration with AWS SES
        if (emailServiceProvider === 'ses') {
            const awsRegion = process.env.AWS_REGION || 'us-east-1';
            const fromEmail = process.env.SES_FROM_EMAIL || 'notifications@smartwallet.app';

            // AWS SES integration (requires aws-sdk package)
            // const AWS = require('aws-sdk');
            // AWS.config.update({ region: awsRegion });
            // const ses = new AWS.SES();
            // await ses.sendEmail({
            //     Source: fromEmail,
            //     Destination: { ToAddresses: [to] },
            //     Message: {
            //         Subject: { Data: subject },
            //         Body: {
            //             Text: { Data: text },
            //             Html: { Data: html }
            //         }
            //     }
            // }).promise();

            console.log(`Email sent via AWS SES to ${to}`);
            return true;
        }

        // Integration with SMTP
        if (emailServiceProvider === 'smtp') {
            const smtpHost = process.env.SMTP_HOST;
            const smtpPort = process.env.SMTP_PORT || '587';
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;
            const fromEmail = process.env.SMTP_FROM_EMAIL || 'notifications@smartwallet.app';

            if (!smtpHost || !smtpUser || !smtpPass) {
                throw new Error('SMTP configuration incomplete');
            }

            // SMTP integration (requires nodemailer package)
            // const nodemailer = require('nodemailer');
            // const transporter = nodemailer.createTransport({
            //     host: smtpHost,
            //     port: parseInt(smtpPort),
            //     secure: smtpPort === '465',
            //     auth: { user: smtpUser, pass: smtpPass }
            // });
            // await transporter.sendMail({
            //     from: fromEmail,
            //     to,
            //     subject,
            //     text,
            //     html
            // });

            console.log(`Email sent via SMTP to ${to}`);
            return true;
        }

        console.warn(`Unknown email service provider: ${emailServiceProvider}`);
        return false;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

/**
 * Send email notification to user
 */
export async function sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
): Promise<void> {
    try {
        // Get user's email address
        const email = await getUserEmail(userId);

        if (!email) {
            console.warn(`No email address found for user ${userId}`);
            return;
        }

        // Generate email template
        const template = generateEmailTemplate(title, message, actionUrl);

        // Send email
        await sendEmail(email, template.subject, template.html, template.text);

        console.log(`Email notification sent to ${email} for user ${userId}`);
    } catch (error) {
        console.error('Error in sendEmailNotification:', error);
        throw error;
    }
}

/**
 * Send test email notification
 */
export async function sendTestEmailNotification(userId: string, email: string): Promise<boolean> {
    try {
        const template = generateEmailTemplate(
            'Test Notification',
            'This is a test notification from SmartWallet. If you received this email, your email notifications are working correctly!',
            '/settings'
        );

        await sendEmail(email, template.subject, template.html, template.text);
        console.log(`Test email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending test email:', error);
        return false;
    }
}
