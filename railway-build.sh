#!/bin/bash

# Railway Build and Deploy Script for Thesis-B
# This script automates the Railway deployment process

set -e

echo "🚂 Starting Railway deployment for Thesis-B..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Installing..."
        npm install -g @railway/cli
        print_success "Railway CLI installed successfully"
    else
        print_success "Railway CLI found"
    fi
}

# Login to Railway
login_railway() {
    print_status "Logging into Railway..."
    if railway whoami &> /dev/null; then
        print_success "Already logged into Railway"
    else
        railway login
        print_success "Logged into Railway successfully"
    fi
}

# Initialize Railway project
init_railway_project() {
    print_status "Initializing Railway project..."
    if [ -f ".railway" ]; then
        print_success "Railway project already initialized"
    else
        railway init
        print_success "Railway project initialized"
    fi
}

# Set environment variables
set_environment_variables() {
    print_status "Setting environment variables..."
    
    # Check if .env.railway exists
    if [ -f ".env.railway" ]; then
        print_status "Loading environment variables from .env.railway..."
        export $(cat .env.railway | grep -v '^#' | xargs)
    fi
    
    # Set required variables
    railway variables set NODE_ENV=production
    railway variables set PORT=5000
    
    # Set DATABASE_URL if provided
    if [ ! -z "$DATABASE_URL" ]; then
        railway variables set DATABASE_URL="$DATABASE_URL"
        print_success "DATABASE_URL set"
    else
        print_warning "DATABASE_URL not set. Please set it manually in Railway dashboard."
    fi
    
    # Set CORS_ORIGIN if provided
    if [ ! -z "$CORS_ORIGIN" ]; then
        railway variables set CORS_ORIGIN="$CORS_ORIGIN"
        print_success "CORS_ORIGIN set"
    else
        print_warning "CORS_ORIGIN not set. Please set it manually in Railway dashboard."
    fi
    
    # Generate and set JWT_SECRET if not provided
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        railway variables set JWT_SECRET="$JWT_SECRET"
        print_success "JWT_SECRET generated and set"
    else
        railway variables set JWT_SECRET="$JWT_SECRET"
        print_success "JWT_SECRET set"
    fi
}

# Deploy backend
deploy_backend() {
    print_status "Deploying backend to Railway..."
    cd backend
    
    # Check if backend has Railway configuration
    if [ ! -f "railway.json" ]; then
        print_status "Creating Railway configuration for backend..."
        cat > railway.json << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
    fi
    
    railway up
    print_success "Backend deployed successfully"
    cd ..
}

# Deploy frontend
deploy_frontend() {
    print_status "Deploying frontend to Railway..."
    cd frontend
    
    # Check if frontend has Railway configuration
    if [ ! -f "railway.json" ]; then
        print_status "Creating Railway configuration for frontend..."
        cat > railway.json << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
    fi
    
    railway up
    print_success "Frontend deployed successfully"
    cd ..
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    cd backend
    railway run npm run migrate
    print_success "Database migrations completed"
    cd ..
}

# Main deployment function
main() {
    print_status "Starting deployment process..."
    
    # Check prerequisites
    check_railway_cli
    login_railway
    init_railway_project
    
    # Set environment variables
    set_environment_variables
    
    # Deploy services
    deploy_backend
    deploy_frontend
    
    # Run migrations
    run_migrations
    
    print_success "🎉 Deployment completed successfully!"
    print_status "Next steps:"
    echo "  1. Check your Railway dashboard for service URLs"
    echo "  2. Test your application endpoints"
    echo "  3. Set up custom domains if needed"
    echo "  4. Monitor logs and performance"
}

# Run main function
main "$@"
