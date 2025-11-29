#!/bin/bash

# Railway Email Setup Script
# This script helps configure email for Railway deployment

echo "🚂 Railway Email Configuration Setup"
echo "===================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI found"
echo ""

# Login check
echo "🔐 Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please login first:"
    echo "   railway login"
    exit 1
fi

echo "✅ Logged in to Railway"
echo ""

# Select email service
echo "📧 Choose your email service for Railway:"
echo "1) SendGrid (Recommended - HTTP API, Railway compatible)"
echo "2) Mailgun SMTP (Alternative - Port 2525)"
echo "3) Skip email configuration"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🎯 Setting up SendGrid..."
        echo ""
        echo "Steps to get SendGrid API key:"
        echo "1. Go to https://sendgrid.com and create account"
        echo "2. Login to dashboard"
        echo "3. Go to Settings → API Keys"
        echo "4. Create new API key with Full Access"
        echo "5. Copy the API key"
        echo ""
        read -p "Enter your SendGrid API key: " sendgrid_key
        
        if [ -z "$sendgrid_key" ]; then
            echo "❌ API key cannot be empty"
            exit 1
        fi
        
        echo "Setting Railway environment variables..."
        railway variables set SENDGRID_API_KEY="$sendgrid_key"
        railway variables set RAILWAY_ENVIRONMENT="production"
        
        echo "✅ SendGrid configured successfully!"
        echo ""
        echo "📝 Next steps:"
        echo "1. Redeploy your Railway service"
        echo "2. Test email functionality"
        echo "3. Check Railway logs: railway logs --tail"
        ;;
        
    2)
        echo ""
        echo "🎯 Setting up Mailgun SMTP..."
        echo ""
        echo "Steps to get Mailgun SMTP credentials:"
        echo "1. Go to https://mailgun.com and create account"
        echo "2. Go to Sending → Domain settings"
        echo "3. Copy SMTP credentials"
        echo ""
        read -p "Enter Mailgun SMTP username: " mailgun_user
        read -p "Enter Mailgun SMTP password: " mailgun_pass
        
        if [ -z "$mailgun_user" ] || [ -z "$mailgun_pass" ]; then
            echo "❌ Username and password cannot be empty"
            exit 1
        fi
        
        echo "Setting Railway environment variables..."
        railway variables set RAILWAY_SMTP_HOST="smtp.mailgun.org"
        railway variables set RAILWAY_SMTP_PORT="2525"
        railway variables set RAILWAY_SMTP_USER="$mailgun_user"
        railway variables set RAILWAY_SMTP_PASS="$mailgun_pass"
        railway variables set RAILWAY_ENVIRONMENT="production"
        
        echo "✅ Mailgun SMTP configured successfully!"
        echo ""
        echo "📝 Next steps:"
        echo "1. Redeploy your Railway service"
        echo "2. Test email functionality"
        echo "3. Check Railway logs: railway logs --tail"
        ;;
        
    3)
        echo "⏭️  Skipping email configuration"
        echo ""
        echo "⚠️  Note: Email functionality will not work on Railway without proper configuration"
        echo "   You can run this script again later to configure email"
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Railway email setup completed!"
echo ""
echo "📚 For more details, see: RAILWAY_EMAIL_SETUP.md"
echo "🔍 To test: Visit your site and try sending feedback replies"
echo "📋 To monitor: railway logs --tail"
