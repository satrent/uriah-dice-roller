const nodemailer = require('nodemailer');

// Create transporter - supports multiple email providers
const createTransporter = () => {
  // Option 1: Resend (Recommended - easiest setup, free tier: 3,000 emails/month)
  // Get API key from https://resend.com/api-keys
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  // Option 2: SendGrid (Free tier: 100 emails/day)
  // Get API key from https://app.sendgrid.com/settings/api_keys
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Option 3: Gmail (Free, but requires App Password)
  // 1. Enable 2FA on your Google account
  // 2. Generate App Password: https://myaccount.google.com/apppasswords
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Option 4: Custom SMTP (for any other provider)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Return null to indicate no email service configured
  // The sendLoginCode function will handle this gracefully
  return null;
};

const sendLoginCode = async (email, code) => {
  const transporter = createTransporter();

  // If no email service is configured, log the code and return success
  // This allows the app to work in development/testing without email setup
  if (!transporter) {
    console.log('⚠️  No email service configured. Login code for', email, 'is:', code);
    console.log('📝 To enable email sending, set one of: RESEND_API_KEY, SENDGRID_API_KEY, GMAIL_USER+GMAIL_APP_PASSWORD, or SMTP_HOST');
    // Return success so the API doesn't fail - the code is logged above
    return { success: true, messageId: 'console-log', devMode: true };
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || (process.env.RESEND_API_KEY ? 'onboarding@resend.dev' : '"Uriah\'s Dice Roller" <noreply@example.com>'),
    to: email,
    subject: 'Your Login Code for Uriah\'s Dice Roller',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #06b6d4;">Your Login Code</h2>
        <p>Your 6-digit login code is:</p>
        <div style="background-color: #1e293b; color: #06b6d4; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #64748b; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
    text: `Your login code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Login code email sent to', email, '- Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // Even if email fails, log the code so the app can still work
    console.log('⚠️  Email sending failed. Login code for', email, 'is:', code);
    // Don't throw - return success with dev mode flag so API can return code to frontend
    return { success: false, error: error.message, devMode: true, code };
  }
};

module.exports = { sendLoginCode };

