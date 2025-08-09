# SendGrid Setup Guide (AWS SES Fallback)

## 🎯 **What We've Implemented**

Your email system now has a **smart fallback mechanism**:

1. **Primary**: Try AWS SES first
2. **Fallback**: If AWS SES fails due to sandbox restrictions → automatically use SendGrid
3. **Development**: If both fail → log to console

## 📋 **SendGrid Setup Steps**

### **Step 1: Create SendGrid Account**

1. **Sign up**: https://sendgrid.com/
2. **Choose plan**: Free tier (100 emails/day) is perfect for testing
3. **Verify your account** (check email)

### **Step 2: Get API Key**

1. **Login to SendGrid Dashboard**
2. **Navigate to**: Settings → API Keys
3. **Click**: "Create API Key"
4. **Name**: "Findmyhelper Email Service"
5. **Permissions**: "Restricted Access" → "Mail Send"
6. **Copy the API key** (starts with `SG.`)

### **Step 3: Configure Your Environment**

**Update your `.env` file:**

```env
# Existing AWS SES config (keep this)
AWS_SES_SMTP_USERNAME="AKIAUW6PYEJFGH5Z2JB6"
AWS_SES_SMTP_PASSWORD="BEff+54kxYRyR4tINm988pzzTRWp5+iq69vANihWux3k"
AWS_SES_SMTP_HOST="email-smtp.eu-north-1.amazonaws.com"
AWS_SES_SMTP_PORT="587"
AWS_SES_FROM_EMAIL="noreply@findmyhelper.ca"

# Add SendGrid config (replace with your actual API key)
SENDGRID_API_KEY="SG.your-actual-api-key-here"
SENDGRID_FROM_EMAIL="noreply@findmyhelper.ca"
```

### **Step 4: Verify Sender (Optional but Recommended)**

1. **In SendGrid Dashboard**: Settings → Sender Authentication
2. **Choose**: "Single Sender Verification" or "Domain Authentication"
3. **For Single Sender**: Add `noreply@findmyhelper.ca`
4. **For Domain**: Add `findmyhelper.ca` (requires DNS changes)

## 🧪 **Testing the Fallback System**

### **Test 1: Verified Email (Should use AWS SES)**
```bash
curl -X POST http://localhost:4000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"findmyhelper2025@gmail.com","purpose":"email_verification"}'
```
**Expected**: Email sent via AWS SES

### **Test 2: Unverified Email (Should use SendGrid)**
```bash
curl -X POST http://localhost:4000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"any-email@example.com","purpose":"email_verification"}'
```
**Expected**: 
1. AWS SES fails with sandbox error
2. System automatically falls back to SendGrid
3. Email sent via SendGrid

## 📊 **How the Fallback Works**

```typescript
// Email sending flow:
1. Try AWS SES first
   ↓
2. If AWS SES fails with "not verified" error
   ↓
3. Automatically try SendGrid
   ↓
4. If SendGrid fails
   ↓
5. Fall back to development mode (console log)
```

## 🔍 **Monitoring**

**Check server logs for:**
- `📧 Email sent successfully via AWS SES:` - AWS worked
- `⚠️ AWS SES sandbox restriction detected, falling back to SendGrid...` - Fallback triggered
- `📧 Email sent successfully via SendGrid (fallback):` - SendGrid worked

## 🎯 **Benefits of This Setup**

✅ **Immediate Testing**: Can test with any email address right now
✅ **Future-Proof**: When AWS SES gets production access, it will work automatically
✅ **Reliable**: Multiple fallback options ensure emails get sent
✅ **Cost-Effective**: Free tier SendGrid for development
✅ **Seamless**: No code changes needed when AWS SES is approved

## 🚀 **Next Steps**

1. **Set up SendGrid account** and get API key
2. **Update `.env` file** with your SendGrid API key
3. **Restart your development server**
4. **Test with any email address** - it should work!
5. **Monitor logs** to see which service is being used

## 📧 **Expected Behavior**

- **Verified emails** (like `findmyhelper2025@gmail.com`) → AWS SES
- **Any other email** → SendGrid (after AWS SES fails)
- **No email service configured** → Development mode (console log)

This setup gives you the best of both worlds: immediate functionality with SendGrid and future scalability with AWS SES! 