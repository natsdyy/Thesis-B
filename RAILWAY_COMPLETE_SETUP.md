# 🚂 Complete Railway Setup Guide

## 🎯 **Your Configuration:**
- **Frontend**: `npm run dev` (Vue.js with Vite)
- **Backend**: `npm start` (Node.js API server)

## 🔧 **Step-by-Step Setup**

### **Step 1: Create Two Separate Services in Railway**

#### **Backend Service:**
1. **Go to Railway project dashboard**
2. **Click "New" → "GitHub Repo"**
3. **Select your repository**
4. **Set Root Directory**: `/backend`
5. **Set Build Command**: `npm install`
6. **Set Start Command**: `npm start`
7. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://postgres:yDKELokUDEzzoeMtKvcMBqRgHoesRrsK@turntable.proxy.rlwy.net:57197/railway
   JWT_SECRET=your-secret-key-here
   CORS_ORIGIN=https://your-frontend-service.up.railway.app
   ```

#### **Frontend Service:**
1. **Click "New" → "GitHub Repo"**
2. **Select your repository again**
3. **Set Root Directory**: `/frontend`
4. **Set Build Command**: `npm ci && npm run build`
5. **Set Start Command**: `npm run dev`
6. **Environment Variables**:
   ```
   VITE_API_BASE_URL=https://your-backend-service.up.railway.app/api
   ```

### **Step 2: Get Your Service URLs**

After both services are deployed, you'll get:
- **Backend URL**: `https://thesis-b-backend-production.up.railway.app`
- **Frontend URL**: `https://thesis-b-frontend-production.up.railway.app`

### **Step 3: Update Cross-References**

1. **Update Backend CORS_ORIGIN**:
   - Go to backend service → Variables
   - Set `CORS_ORIGIN` to your frontend URL

2. **Update Frontend API URL**:
   - Go to frontend service → Variables
   - Set `VITE_API_BASE_URL` to your backend URL + `/api`

### **Step 4: Run Database Migrations**

```bash
cd backend
railway run npm run migrate
```

## 🧪 **Testing Your Setup**

### **Backend Test:**
```bash
curl https://your-backend-service.up.railway.app/api/health
# Should return: {"status":"healthy",...}
```

### **Frontend Test:**
- Visit: `https://your-frontend-service.up.railway.app`
- Should show: Your Vue.js application

## 📋 **Current Configuration Files**

### **Frontend (frontend/railway.json):**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "npm run dev",
    "healthcheckPath": "/"
  }
}
```

### **Backend (backend/railway.json):**
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

## 🎯 **Expected Results**

- **Backend**: Serves API endpoints, health check, database operations
- **Frontend**: Serves Vue.js application with login, dashboard, etc.
- **Integration**: Frontend can communicate with backend APIs

---

**This setup will give you both services running with the correct commands!** 🚀
