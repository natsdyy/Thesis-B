# 🔒 Security Setup Guide

## ⚠️ CRITICAL: Your application has security vulnerabilities that need immediate attention!

### Issues Found:

1. **Hardcoded Gmail credentials** in source code
2. **Debug logging** exposing sensitive information
3. **Missing environment variables** configuration

### ✅ Fixes Applied:

- ✅ Removed hardcoded credentials from `emailService.js`
- ✅ Disabled debug logging for security
- ✅ `.env` file is already in `.gitignore`

### 🛠️ Required Actions:

#### 1. Create Environment File

Create `backend/.env` with the following content:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=countryside_steakhouse

# Email Configuration (Required for email functionality)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# SendGrid Configuration (Optional - for production)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Application Configuration
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
PORT=5000

# JWT Configuration (Required for authentication)
JWT_SECRET=your_jwt_secret_here

# Other Configuration
TIMEZONE=Asia/Manila

# Railway Environment (for production deployment)
RAILWAY_ENVIRONMENT=production
```

#### 2. Generate New Gmail App Password

**IMPORTANT**: The current Gmail App Password `sclg quvi fuyh dcfa` is compromised and visible in logs.

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication if not already enabled
3. Go to "App passwords"
4. Generate a new app password for "Mail"
5. Replace `your_gmail_app_password_here` with the new password

#### 3. Generate JWT Secret

```bash
# Generate a secure random JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### 4. Restart Application

After creating the `.env` file:

```bash
npm run dev
```

### 🚨 Security Best Practices:

1. **Never commit `.env` files** to version control
2. **Use strong, unique passwords** for all services
3. **Enable 2FA** on all accounts
4. **Regularly rotate** API keys and passwords
5. **Monitor logs** for sensitive information exposure
6. **Use environment-specific** configurations

### 🔍 Verification:

After setup, verify security by:

1. Checking that no credentials appear in terminal logs
2. Confirming email functionality works
3. Testing authentication endpoints

### 📞 Support:

If you encounter issues, check:

- `.env` file exists in `backend/` directory
- All required environment variables are set
- Gmail App Password is valid and not expired
- No typos in environment variable names
