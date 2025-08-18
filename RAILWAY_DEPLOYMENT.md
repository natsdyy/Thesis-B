# Railway Deployment Guide for Thesis-B

This guide will help you deploy your Thesis-B application to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI tool
3. **Git Repository**: Your code should be in a Git repository

## Quick Start

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Initialize Railway Project

```bash
railway init
```

### 4. Deploy Backend

```bash
cd backend
railway up
```

### 5. Deploy Frontend

```bash
cd frontend
railway up
```

## Manual Deployment Steps

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository

### Step 2: Set Up Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Note down the connection details
4. Copy the `DATABASE_URL` from the "Connect" tab

### Step 3: Configure Environment Variables

Set these environment variables in your Railway project:

```bash
# Backend Service
NODE_ENV=production
PORT=5000
DATABASE_URL=your_railway_postgres_url_here
JWT_SECRET=your_generated_jwt_secret_here
CORS_ORIGIN=https://your-frontend-domain.railway.app

# Frontend Service (if needed)
VITE_API_BASE_URL=https://your-backend-domain.railway.app
```

### Step 4: Deploy Services

#### Backend Deployment
1. Create a new service in Railway
2. Choose "GitHub Repo"
3. Select your repository
4. Set the root directory to `/backend`
5. Set the build command: `npm install && npm run migrate`
6. Set the start command: `npm start`

#### Frontend Deployment
1. Create another service in Railway
2. Choose "GitHub Repo"
3. Select your repository
4. Set the root directory to `/frontend`
5. Set the build command: `npm install && npm run build`
6. Set the start command: `npm run preview`

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in your backend directory:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=your_railway_postgres_url
JWT_SECRET=your_jwt_secret
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

### Frontend Environment Variables

Create a `.env` file in your frontend directory:

```env
VITE_API_BASE_URL=https://your-backend-domain.railway.app
```

## Database Migration

After deployment, run migrations:

```bash
cd backend
railway run npm run migrate
```

## Testing Your Deployment

1. **Backend Health Check**: Visit `https://your-backend-domain.railway.app/api/health`
2. **Frontend**: Visit your frontend Railway URL
3. **Database**: Check Railway dashboard for database status

## Troubleshooting

### Common Issues

1. **Build Failures**: Check build logs in Railway dashboard
2. **Database Connection**: Verify `DATABASE_URL` is correct
3. **CORS Errors**: Ensure `CORS_ORIGIN` matches your frontend URL
4. **Port Issues**: Railway automatically assigns ports, use `process.env.PORT`

### Logs

View logs in Railway dashboard or use CLI:

```bash
railway logs
```

## Custom Domains

1. Go to your service in Railway
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS records as instructed

## Monitoring

Railway provides:
- Real-time logs
- Performance metrics
- Error tracking
- Automatic scaling

## Cost Optimization

- Use Railway's free tier for development
- Monitor usage in the dashboard
- Set up usage alerts

## Security Best Practices

1. Never commit `.env` files
2. Use strong JWT secrets
3. Enable HTTPS (automatic in Railway)
4. Set appropriate CORS origins
5. Use environment variables for sensitive data

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- GitHub Issues: For code-specific problems
