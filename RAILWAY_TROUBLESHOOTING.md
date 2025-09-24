# 🚨 Railway Deployment Troubleshooting Guide

## ❌ **Health Check Failed - Service Unavailable**

If you're seeing this error:
```
Attempt #1 failed with service unavailable. Continuing to retry for 4m49s
...
1/1 replicas never became healthy!
Healthcheck failed!
```

## 🔍 **Step-by-Step Diagnosis**

### **1. Check Railway Service Logs**
1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to "Deployments" tab
4. Click on the latest deployment
5. Click "View Logs" to see what's happening

### **2. Common Issues and Solutions**

#### **Issue A: Port Configuration Problem**
**Symptoms**: Server starts but health check fails
**Solution**: 
- Railway uses `process.env.PORT` (not `BACKEND_PORT`)
- Fixed in server.js: `const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;`

#### **Issue B: Server Not Binding to 0.0.0.0**
**Symptoms**: Server only listens on localhost
**Solution**: 
- Fixed in server.js: `app.listen(PORT, "0.0.0.0", ...)`
- Railway needs to bind to all interfaces, not just localhost

#### **Issue C: Database Connection Failing**
**Symptoms**: Server starts but crashes during database connection
**Solution**:
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL service is running
- Run migrations manually: `railway run npm run migrate`

#### **Issue D: Missing Dependencies**
**Symptoms**: Build fails or server won't start
**Solution**:
- Check that all dependencies are in `package.json`
- Ensure `npm install` completes successfully

### **3. Environment Variables Checklist**

Make sure these are set in Railway:

**Backend Service:**
```
NODE_ENV=production
PORT=5000 (Railway will override this)
DATABASE_URL=postgresql://username:password@hostname:port/database
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=https://your-frontend-service.up.railway.app
```

**Frontend Service:**
```
VITE_API_BASE_URL=https://your-backend-service.up.railway.app/api
```

### **4. Manual Testing Steps**

#### **Test Health Check Locally:**
```bash
cd backend
npm start
# In another terminal:
curl http://localhost:5000/api/health
# Should return: {"status":"healthy","timestamp":"...","environment":"production"}
```

#### **Test Railway Health Check:**
```bash
# After deployment, test the health endpoint:
curl https://your-backend-service.up.railway.app/api/health
```

### **5. Railway-Specific Fixes**

#### **Fix 1: Update Railway Configuration**
The `railway.json` files have been updated with:
- Proper health check path: `/api/health`
- Health check timeout: 300 seconds
- Health check interval: 10 seconds

#### **Fix 2: Server Configuration**
Updated `server.js` with:
- Proper port handling: `process.env.PORT || process.env.BACKEND_PORT || 5000`
- Bind to all interfaces: `app.listen(PORT, "0.0.0.0", ...)`
- Better error handling and logging
- Graceful shutdown handling

#### **Fix 3: Health Check Endpoint**
Added robust health check at `/api/health`:
```javascript
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});
```

### **6. Deployment Steps (Correct Order)**

1. **Create Railway Project**
2. **Add PostgreSQL Database** (get DATABASE_URL)
3. **Deploy Backend Service**:
   - Root directory: `/backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Set environment variables
4. **Deploy Frontend Service**:
   - Root directory: `/frontend`
   - Build command: `npm ci && npm run build`
   - Start command: `npm run preview`
   - Set VITE_API_BASE_URL
5. **Run Database Migrations**:
   ```bash
   railway run npm run migrate
   ```

### **7. Debugging Commands**

#### **Check Service Status:**
```bash
railway status
```

#### **View Logs:**
```bash
railway logs
```

#### **Run Commands in Railway:**
```bash
railway run npm run migrate
railway run node -e "console.log(process.env.PORT)"
```

#### **Test Database Connection:**
```bash
railway run node -e "require('./config/database').testConnection()"
```

### **8. Common Error Messages and Solutions**

| Error Message | Solution |
|---------------|----------|
| `EADDRINUSE` | Port already in use - Railway will assign a different port |
| `ECONNREFUSED` | Database connection failed - check DATABASE_URL |
| `Module not found` | Missing dependency - check package.json |
| `CORS error` | Wrong CORS_ORIGIN - should match frontend URL exactly |
| `Health check failed` | Server not responding - check logs for startup errors |

### **9. Quick Fix Checklist**

- [ ] Backend service root directory set to `/backend`
- [ ] Frontend service root directory set to `/frontend`
- [ ] DATABASE_URL environment variable set correctly
- [ ] CORS_ORIGIN matches frontend URL exactly
- [ ] VITE_API_BASE_URL matches backend URL exactly
- [ ] Health check endpoint accessible at `/api/health`
- [ ] Server binding to `0.0.0.0` not just `localhost`
- [ ] Database migrations run successfully
- [ ] No build errors in deployment logs

### **10. Still Having Issues?**

1. **Check Railway Status**: Visit [status.railway.app](https://status.railway.app)
2. **Railway Discord**: Join Railway's Discord for community support
3. **Railway Docs**: Check [docs.railway.app](https://docs.railway.app)
4. **Service Logs**: Always check the deployment logs first

---

**The fixes I've implemented should resolve the health check failure. Try redeploying your backend service with the updated configuration!** 🚀
