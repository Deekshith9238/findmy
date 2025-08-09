import nodemailer from 'nodemailer';

// Create email transporter with fallback system
const createTransporter = (service: 'aws' | 'sendgrid' = 'aws') => {
  // Option 1: AWS SES (primary)
  if (service === 'aws' && process.env.AWS_SES_SMTP_USERNAME && process.env.AWS_SES_SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.AWS_SES_SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
      port: parseInt(process.env.AWS_SES_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.AWS_SES_SMTP_USERNAME,
        pass: process.env.AWS_SES_SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  
  // Option 2: SendGrid (fallback)
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      }
    });
  }
  
  // Option 3: Gmail SMTP (development)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      }
    });
  }
  
  // Option 4: Development mode - just log emails
  return null;
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    // Try AWS SES first
    let transporter = createTransporter('aws');
    let fromEmail = process.env.AWS_SES_FROM_EMAIL || '"Findmyhelper" <noreply@findmyhelper.com>';
    let serviceUsed = 'AWS SES';
    
    if (transporter) {
      try {
        const mailOptions = {
          from: fromEmail,
          to,
          subject,
          text,
          html: html || text,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('📧 Email sent successfully via AWS SES:', info.messageId);
        return true;
      } catch (awsError: any) {
        // Check if it's a sandbox restriction error
        if (awsError.responseCode === 554 && awsError.response?.includes('not verified')) {
          console.log('⚠️ AWS SES sandbox restriction detected, falling back to SendGrid...');
          
          // Try SendGrid as fallback
          transporter = createTransporter('sendgrid');
          fromEmail = process.env.SENDGRID_FROM_EMAIL || '"Findmyhelper" <noreply@findmyhelper.ca>';
          serviceUsed = 'SendGrid';
          
          if (transporter) {
            try {
              const mailOptions = {
                from: fromEmail,
                to,
                subject,
                text,
                html: html || text,
              };

              const info = await transporter.sendMail(mailOptions);
              console.log('📧 Email sent successfully via SendGrid (fallback):', info.messageId);
              return true;
            } catch (sendgridError) {
              console.error('❌ SendGrid also failed:', sendgridError);
              throw sendgridError;
            }
          } else {
            console.error('❌ SendGrid not configured, falling back to development mode');
          }
        } else {
          // Other AWS error, throw it
          throw awsError;
        }
      }
    }
    
    // If no AWS SES or SendGrid, try Gmail
    transporter = createTransporter('sendgrid'); // This will actually try Gmail if SendGrid not configured
    if (transporter) {
      fromEmail = `"Findmyhelper" <${process.env.GMAIL_USER}>`;
      serviceUsed = 'Gmail';
      
      const mailOptions = {
        from: fromEmail,
        to,
        subject,
        text,
        html: html || text,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully via ${serviceUsed}:`, info.messageId);
      return true;
    }
    
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