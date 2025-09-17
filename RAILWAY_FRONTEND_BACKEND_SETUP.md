# 🚂 Railway Frontend + Backend Setup Guide

## 🎯 **Current Issue: Seeing Backend Instead of Frontend**

You're seeing the backend service instead of the frontend because you need **TWO separate services** in Railway.

## 🔧 **Step-by-Step Fix**

### **Step 1: Check Your Current Railway Project**

Go to your Railway project dashboard. You should see:

**❌ WRONG**: Only 1 service (backend)
**✅ CORRECT**: 2 services (backend + frontend)

### **Step 2: Create Frontend Service (If Missing)**

If you only have a backend service:

1. **In your Railway project dashboard:**
   - Click "New" 
   - Select "GitHub Repo"
   - Choose your repository again

2. **Configure Frontend Service:**
   - **Root Directory**: `/frontend` ⚠️ **CRITICAL**
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run preview`

3. **Set Environment Variables:**
   ```
   VITE_API_BASE_URL=https://your-backend-service.up.railway.app/api
   ```

### **Step 3: Verify Service URLs**

After both services are deployed, you'll have:

- **Backend URL**: `https://thesis-b-backend-production.up.railway.app`
  - Shows: API endpoints, JSON responses, `/api/health`
  
- **Frontend URL**: `https://thesis-b-frontend-production.up.railway.app`
  - Shows: Your Vue.js application, login page, dashboard

### **Step 4: Update Cross-References**

Once you have both URLs:

1. **Update Backend CORS_ORIGIN:**
   - Go to backend service → Variables
   - Set `CORS_ORIGIN` to your frontend URL

2. **Update Frontend API URL:**
   - Go to frontend service → Variables  
   - Set `VITE_API_BASE_URL` to your backend URL + `/api`

## 📋 **Complete Service Configuration**

### **Backend Service Settings:**
```
Root Directory: /backend
Build Command: npm install
Start Command: npm start
Health Check: /api/health

Environment Variables:
- NODE_ENV=production
- DATABASE_URL=postgresql://...
- JWT_SECRET=your-secret
- CORS_ORIGIN=https://your-frontend-service.up.railway.app
```

### **Frontend Service Settings:**
```
Root Directory: /frontend
Build Command: npm ci && npm run build
Start Command: npm run preview
Health Check: /

Environment Variables:
- VITE_API_BASE_URL=https://your-backend-service.up.railway.app/api
```

## 🧪 **Testing Your Setup**

### **Test Backend:**
```bash
curl https://your-backend-service.up.railway.app/api/health
# Should return: {"status":"healthy",...}
```

### **Test Frontend:**
- Visit: `https://your-frontend-service.up.railway.app`
- Should show: Your Vue.js application (login page, dashboard, etc.)

### **Test Integration:**
- Try logging in on the frontend
- Check if it can communicate with the backend APIs

## 🐛 **Common Issues & Solutions**

### **Issue 1: Only One Service**
**Problem**: Only backend service exists
**Solution**: Create frontend service with `/frontend` root directory

### **Issue 2: Wrong Root Directory**
**Problem**: Frontend service using wrong root directory
**Solution**: Change root directory to `/frontend`

### **Issue 3: Frontend Shows Backend**
**Problem**: Accessing backend URL instead of frontend URL
**Solution**: Use the correct frontend service URL

### **Issue 4: CORS Errors**
**Problem**: Frontend can't communicate with backend
**Solution**: Update `CORS_ORIGIN` in backend to match frontend URL

### **Issue 5: API Connection Failed**
**Problem**: Frontend can't reach backend APIs
**Solution**: Update `VITE_API_BASE_URL` in frontend to match backend URL

## 🔄 **Quick Fix Commands**

If you need to redeploy:

```bash
# Backend service
cd backend
railway up

# Frontend service  
cd frontend
railway up
```

## 📊 **Expected Results**

After correct setup:

1. **Backend Service**: 
   - URL: `https://thesis-b-backend-production.up.railway.app`
   - Shows: API documentation, health check, JSON responses

2. **Frontend Service**:
   - URL: `https://thesis-b-frontend-production.up.railway.app`  
   - Shows: Your Vue.js application with login, dashboard, etc.

3. **Integration**:
   - Frontend can communicate with backend APIs
   - No CORS errors
   - Full application functionality

## 🎯 **Action Items**

1. **Check Railway Dashboard**: Verify you have 2 services
2. **Create Frontend Service**: If missing, create with `/frontend` root
3. **Update URLs**: Set correct cross-references between services
4. **Test Both Services**: Verify backend and frontend work independently
5. **Test Integration**: Verify frontend can communicate with backend

---

**The key is having TWO separate services in Railway - one for backend, one for frontend!** 🚀
