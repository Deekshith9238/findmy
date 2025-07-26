import * as crypto from 'crypto';
import { storage } from './storage';

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via email (mock implementation - replace with real email service)
export async function sendOTPEmail(email: string, otp: string, purpose: string): Promise<boolean> {
  try {
    // TODO: Replace with real email service (SendGrid, AWS SES, etc.)
    console.log(`📧 Sending OTP to ${email}: ${otp} (Purpose: ${purpose})`);
    
    // Mock email sending - always succeeds in development
    // In production, integrate with:
    // - SendGrid: sgMail.send({ to: email, subject: `Your OTP Code: ${otp}`, text: `Your verification code is: ${otp}` })
    // - AWS SES: ses.sendEmail({ Destination: { ToAddresses: [email] }, Message: { Subject: { Data: `OTP: ${otp}` }, Body: { Text: { Data: `Your code: ${otp}` } } } })
    // - Nodemailer: transporter.sendMail({ from: 'noreply@findmyhelper.com', to: email, subject: `OTP: ${otp}`, text: `Your verification code is: ${otp}` })
    
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}

// Create and store OTP
export async function createOTP(email: string, purpose: 'email_verification' | 'login_verification' | 'password_reset'): Promise<string> {
  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
  
  await storage.createOtpVerification({
    email,
    otpCode,
    purpose,
    expiresAt,
    isUsed: false,
    attempts: 0
  });
  
  await sendOTPEmail(email, otpCode, purpose);
  return otpCode;
}

// Verify OTP
export async function verifyOTP(email: string, otpCode: string, purpose: string): Promise<{ success: boolean; message: string }> {
  try {
    const otpRecord = await storage.getOtpVerification(email, otpCode, purpose);
    
    if (!otpRecord) {
      return { success: false, message: 'Invalid OTP code' };
    }
    
    if (otpRecord.isUsed) {
      return { success: false, message: 'OTP code already used' };
    }
    
    if (new Date() > otpRecord.expiresAt) {
      return { success: false, message: 'OTP code expired' };
    }
    
    if (otpRecord.attempts >= 3) {
      return { success: false, message: 'Too many attempts. Please request a new OTP' };
    }
    
    // Mark OTP as used
    await storage.updateOtpVerification(otpRecord.id, { isUsed: true });
    
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    console.error('OTP verification error:', error);
    return { success: false, message: 'Verification failed' };
  }
}

// Hash password
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}