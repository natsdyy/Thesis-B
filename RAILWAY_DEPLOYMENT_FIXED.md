# 🚂 Railway Deployment Guide - FIXED VERSION

This guide provides the **correct** way to deploy your Thesis-B application to Railway after fixing the deployment issues.

## 🔧 **What Was Fixed**

1. **Separate Service Configuration**: Created separate `railway.json` files for backend and frontend
2. **API Configuration**: Updated frontend to use absolute URLs for production
3. **CORS Settings**: Enhanced CORS to allow Railway domains
4. **Health Checks**: Added proper health check endpoints
5. **Removed Static Serving**: Backend no longer serves frontend files

## 🚀 **Step-by-Step Deployment**

### **Step 1: Create Railway Project**
1. Go to [railway.app](https://railway.app) and login
2. Click "New Project"
3. Choose "Empty Project"

### **Step 2: Add PostgreSQL Database**
1. In your project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Copy the `DATABASE_URL` from the Variables tab

### **Step 3: Deploy Backend Service**
1. Click "New" → "GitHub Repo"
2. Select your repository
3. **IMPORTANT**: Set **Root Directory** to `/backend`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add these environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=your_copied_database_url_here
   JWT_SECRET=generate_with_openssl_rand_base64_32
   CORS_ORIGIN=https://your-frontend-domain.railway.app
   ```

### **Step 4: Deploy Frontend Service**
1. Click "New" → "GitHub Repo" 
2. Select your repository again
3. **IMPORTANT**: Set **Root Directory** to `/frontend`
4. Set **Build Command**: `npm ci && npm run build`
5. Set **Start Command**: `npm run preview`
6. Add this environment variable:
   ```
   VITE_API_BASE_URL=https://your-backend-domain.railway.app/api
   ```

### **Step 5: Update Environment Variables**
After both services are deployed, get their URLs and update:

**Backend Service Variables:**
```
CORS_ORIGIN=https://thesis-b-frontend-production.up.railway.app
```

**Frontend Service Variables:**
```
VITE_API_BASE_URL=https://thesis-b-backend-production.up.railway.app/api
```

### **Step 6: Run Database Migrations**
1. Go to your backend service in Railway
2. Go to "Deployments" tab
3. Click the three dots → "View Logs"
4. In the Railway CLI or dashboard, run:
   ```bash
   railway run npm run migrate
   ```

## 📋 **Deployment Checklist**

- [ ] PostgreSQL database created and `DATABASE_URL` copied
- [ ] Backend service deployed with `/backend` root directory
- [ ] Frontend service deployed with `/frontend` root directory  
- [ ] Backend environment variables set (NODE_ENV, DATABASE_URL, JWT_SECRET, CORS_ORIGIN)
- [ ] Frontend environment variables set (VITE_API_BASE_URL)
- [ ] Both services showing "Active" status
- [ ] Database migrations run successfully
- [ ] Backend health check working: `/api/health`
- [ ] Frontend accessible and can communicate with backend

## 🧪 **Testing Your Deployment**

1. **Backend Health Check**: 
   Visit: `https://your-backend-service.railway.app/api/health`
   Should return: `{"status":"healthy","timestamp":"...","environment":"production"}`

2. **Frontend Access**:
   Visit: `https://your-frontend-service.railway.app`
   Should load your application

3. **API Integration**:
   Test login/signup functionality to verify frontend-backend communication

## 🐛 **Troubleshooting**

### **Frontend Not Loading**
- Check that root directory is set to `/frontend`
- Verify build command: `npm ci && npm run build`
- Check build logs for errors

### **Backend API Errors**
- Verify `DATABASE_URL` is correct
- Check that `CORS_ORIGIN` matches your frontend URL exactly
- Look at backend logs for specific errors

### **CORS Errors**
- Ensure `CORS_ORIGIN` in backend matches frontend URL
- Check that both services are using HTTPS URLs
- Verify no trailing slashes in URLs

### **Database Connection Issues**
- Confirm `DATABASE_URL` is copied correctly from Railway PostgreSQL
- Run migrations: `railway run npm run migrate`
- Check database service is running

## 📊 **Expected Results**

After successful deployment, you should have:
- **Backend URL**: `https://thesis-b-backend-production.up.railway.app`
- **Frontend URL**: `https://thesis-b-frontend-production.up.railway.app`
- **Database**: PostgreSQL instance connected to backend
- **Health Check**: `GET /api/health` returns 200 OK
- **Full Functionality**: Frontend can communicate with backend APIs

## 🔄 **Redeployment**

For future updates:
1. Push changes to your GitHub repository
2. Railway will automatically redeploy both services
3. Check logs to ensure successful deployment
4. Test functionality after deployment

## 💡 **Pro Tips**

1. **Environment Variables**: Use Railway's web interface to manage environment variables
2. **Logs**: Monitor both services' logs during deployment
3. **Custom Domains**: You can add custom domains in Railway settings
4. **Scaling**: Railway can auto-scale based on traffic
5. **Monitoring**: Set up Railway's monitoring and alerts

---

**This deployment method will work correctly with your current codebase!** 🎉
