# 🚂 Fixed Railway Deployment Guide

This guide addresses the build failure you encountered and provides the correct deployment strategy.

## ❌ The Problem You Encountered

Your Railway build failed with this error:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@vitejs/plugin-vue'
```

**Root Cause**: Railway was trying to build from the root directory instead of the frontend directory, causing dependency resolution issues.

## ✅ The Solution

We need to deploy the **backend** and **frontend** as **separate services** in Railway, not as one monolithic service.

## 🚀 Correct Deployment Steps

### Step 1: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository

### Step 2: Create Backend Service
1. In your Railway project, click "New"
2. Choose "GitHub Repo"
3. Select your repository
4. **IMPORTANT**: Set the **Root Directory** to `/backend`
5. Set the **Build Command** to: `npm install`
6. Set the **Start Command** to: `npm start`

### Step 3: Create Frontend Service
1. Click "New" again
2. Choose "GitHub Repo"
3. Select your repository
4. **IMPORTANT**: Set the **Root Directory** to `/frontend`
5. Set the **Build Command** to: `npm ci && npm run build`
6. Set the **Start Command** to: `npm run preview`

### Step 4: Set Environment Variables

#### Backend Service Variables:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=your_railway_postgres_url
JWT_SECRET=your_generated_secret
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

#### Frontend Service Variables:
```
NODE_ENV=production
VITE_API_BASE_URL=https://your-backend-domain.railway.app
```

## 🔧 Why This Fixes Your Issue

1. **Separate Build Contexts**: Each service builds from its own directory with its own `package.json`
2. **Proper Dependency Resolution**: Frontend service will find `@vitejs/plugin-vue` in its own `node_modules`
3. **Correct Build Commands**: Each service uses the appropriate build and start commands
4. **Isolated Environments**: Backend and frontend can have different configurations

## 📋 Deployment Checklist

- [ ] Create Railway project
- [ ] Create backend service with `/backend` root directory
- [ ] Create frontend service with `/frontend` root directory
- [ ] Set backend environment variables
- [ ] Set frontend environment variables
- [ ] Deploy backend service
- [ ] Deploy frontend service
- [ ] Test backend health endpoint
- [ ] Test frontend accessibility
- [ ] Run database migrations

## 🐛 Troubleshooting

### If Frontend Still Fails:
1. Check that root directory is set to `/frontend`
2. Verify build command is `npm ci && npm run build`
3. Check Railway build logs for specific errors
4. Ensure all dependencies are in `frontend/package.json`

### If Backend Fails:
1. Check that root directory is set to `/backend`
2. Verify build command is `npm install`
3. Check that `DATABASE_URL` is set correctly
4. Verify backend can connect to database

## 🌐 After Successful Deployment

You'll get two URLs:
- **Backend**: `https://your-backend-service.railway.app`
- **Frontend**: `https://your-frontend-service.railway.app`

## 🔄 Database Setup

After backend is deployed:
1. Go to backend service in Railway
2. Click "Variables" tab
3. Set `DATABASE_URL` to your Railway PostgreSQL URL
4. Go to "Deployments" tab
5. Click "Deploy" to restart with new variables
6. Run migrations: `railway run npm run migrate`

## 📱 Testing

1. **Backend Health**: Visit `/api/health` on backend URL
2. **Frontend**: Visit frontend URL
3. **API Docs**: Visit `/api-docs` on backend URL
4. **Integration**: Test frontend-to-backend communication

---

**This approach will resolve your build failure and deploy both services correctly!** 🎉
