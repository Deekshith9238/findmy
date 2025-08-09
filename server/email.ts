// Simple email service for development
// In production, you would use a real email service like SendGrid, AWS SES, or Nodemailer

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    // For development, we'll just log the email details
    // In production, this would send actual emails
    console.log('📧 EMAIL SENT (Development Mode)');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Text:', text);
    console.log('HTML:', html);
    console.log('---');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendOTPEmail = async (email: string, otp: string, purpose: string) => {
  const subject = `Your Findmyhelper Verification Code: ${otp}`;
  const text = `
    Hello!

    Your verification code is: ${otp}

    This code will expire in 10 minutes.

    If you didn't request this code, please ignore this email.

    Best regards,
    The Findmyhelper Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Findmyhelper Verification</h2>
      <p>Hello!</p>
      <p>Your verification code is:</p>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h1 style="color: #3b82f6; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">
        Best regards,<br>
        The Findmyhelper Team
      </p>
    </div>
  `;

  return sendEmail(email, subject, text, html);
};

// For production, you can uncomment and use this with a real email service:
/*
import nodemailer from 'nodemailer';

const createTransporter = () => {
  // Example with Gmail (you'll need to enable 2FA and use an app password)
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"Findmyhelper" <noreply@findmyhelper.com>',
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email sent successfully!', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};
*/ 