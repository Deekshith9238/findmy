import nodemailer from 'nodemailer';

// Create email transporter for AWS SES
const createTransporter = () => {
  // Check if AWS email credentials are configured
  if (process.env.AWS_SES_SMTP_USERNAME && process.env.AWS_SES_SMTP_PASSWORD) {
    // Use AWS SES SMTP
    return nodemailer.createTransport({
      host: process.env.AWS_SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
      port: parseInt(process.env.AWS_SES_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME,
        pass: process.env.AWS_SES_SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  } else {
    // Fallback for development - just log emails
    return null;
  }
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    const transporter = createTransporter();
    
    if (transporter) {
      // Production mode - send real emails via AWS SES
      const mailOptions = {
        from: process.env.AWS_SES_FROM_EMAIL || '"Findmyhelper" <noreply@findmyhelper.com>',
        to,
        subject,
        text,
        html: html || text,
      };

      const info = await transporter.sendMail(mailOptions);
      return true;
    } else {
      // Development mode - just log the email details
      console.log('📧 EMAIL SENT (Development Mode)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Text:', text);
      console.log('HTML:', html);
      console.log('---');
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    }
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