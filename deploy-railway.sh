#!/bin/bash

# Railway Deployment Script for Thesis-B
# This script helps deploy your application to Railway

echo "🚂 Starting Railway deployment for Thesis-B..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Logging into Railway..."
railway login

# Create new project if it doesn't exist
echo "📁 Creating Railway project..."
railway init

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=5000

# Set database URL (you'll need to update this with your actual Railway database URL)
echo "🗄️ Setting database URL..."
echo "Please enter your Railway PostgreSQL database URL:"
read -p "DATABASE_URL: " db_url
railway variables set DATABASE_URL="$db_url"

# Set CORS origin
echo "🌐 Setting CORS origin..."
echo "Please enter your frontend Railway URL:"
read -p "CORS_ORIGIN: " cors_origin
railway variables set CORS_ORIGIN="$cors_origin"

# Set JWT secret
echo "🔑 Setting JWT secret..."
jwt_secret=$(openssl rand -base64 32)
railway variables set JWT_SECRET="$jwt_secret"

# Deploy backend
echo "🚀 Deploying backend to Railway..."
cd backend
railway up

# Deploy frontend
echo "🎨 Deploying frontend to Railway..."
cd ../frontend
railway up

echo "✅ Deployment completed!"
echo "🌐 Your app should now be available at:"
echo "   Backend: https://your-backend-service.railway.app"
echo "   Frontend: https://your-frontend-service.railway.app"
echo ""
echo "📋 Next steps:"
echo "   1. Update your frontend API base URL to point to your Railway backend"
echo "   2. Test your application endpoints"
echo "   3. Set up custom domains if needed"
