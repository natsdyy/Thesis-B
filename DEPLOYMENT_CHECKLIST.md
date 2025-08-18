# Railway Deployment Checklist

Use this checklist to ensure your Thesis-B application is properly deployed to Railway.

## Pre-Deployment Checklist

- [ ] **Railway Account**: Created account at [railway.app](https://railway.app)
- [ ] **Railway CLI**: Installed Railway CLI (`npm install -g @railway/cli`)
- [ ] **Git Repository**: Code is committed and pushed to GitHub
- [ ] **Environment Variables**: Created `.env.railway` file with required variables
- [ ] **Database**: Railway PostgreSQL database is created and running

## Environment Variables Checklist

### Backend Variables
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `DATABASE_URL=your_railway_postgres_url`
- [ ] `JWT_SECRET=your_generated_secret`
- [ ] `CORS_ORIGIN=https://your-frontend-domain.railway.app`

### Frontend Variables
- [ ] `VITE_API_BASE_URL=https://your-backend-domain.railway.app`

## Deployment Steps

### 1. Backend Deployment
- [ ] Login to Railway CLI (`railway login`)
- [ ] Initialize Railway project (`railway init`)
- [ ] Navigate to backend directory (`cd backend`)
- [ ] Deploy backend (`railway up`)
- [ ] Verify backend is running (check health endpoint)
- [ ] Note backend URL for frontend configuration

### 2. Frontend Deployment
- [ ] Navigate to frontend directory (`cd frontend`)
- [ ] Update API base URL in environment variables
- [ ] Deploy frontend (`railway up`)
- [ ] Verify frontend is accessible
- [ ] Note frontend URL for backend CORS configuration

### 3. Database Setup
- [ ] Run database migrations (`railway run npm run migrate`)
- [ ] Verify database connection in backend logs
- [ ] Check if tables are created correctly

### 4. Configuration Updates
- [ ] Update backend CORS_ORIGIN with frontend URL
- [ ] Update frontend VITE_API_BASE_URL with backend URL
- [ ] Redeploy both services if needed

## Post-Deployment Testing

### Backend Testing
- [ ] Health check endpoint (`/api/health`)
- [ ] Database health check (`/api/health/db`)
- [ ] Authentication endpoints
- [ ] API documentation (`/api-docs`)

### Frontend Testing
- [ ] Application loads without errors
- [ ] Navigation works correctly
- [ ] API calls to backend succeed
- [ ] User authentication works
- [ ] All major features function properly

### Integration Testing
- [ ] Frontend can communicate with backend
- [ ] Database operations work correctly
- [ ] File uploads/downloads work (if applicable)
- [ ] Real-time features work (if applicable)

## Monitoring & Maintenance

- [ ] Set up Railway monitoring alerts
- [ ] Monitor application logs regularly
- [ ] Check database performance
- [ ] Monitor API response times
- [ ] Set up error tracking (if applicable)

## Troubleshooting Common Issues

### Build Failures
- [ ] Check build logs in Railway dashboard
- [ ] Verify all dependencies are in package.json
- [ ] Check for syntax errors in code

### Database Connection Issues
- [ ] Verify DATABASE_URL is correct
- [ ] Check if database is running
- [ ] Verify SSL configuration

### CORS Errors
- [ ] Ensure CORS_ORIGIN matches frontend URL exactly
- [ ] Check backend CORS configuration
- [ ] Verify frontend is making requests to correct backend URL

### Port Issues
- [ ] Use `process.env.PORT` in backend
- [ ] Railway automatically assigns ports
- [ ] Check Railway service configuration

## Security Checklist

- [ ] Environment variables are not committed to Git
- [ ] JWT_SECRET is strong and unique
- [ ] CORS_ORIGIN is properly restricted
- [ ] HTTPS is enabled (automatic in Railway)
- [ ] Database credentials are secure

## Performance Optimization

- [ ] Enable gzip compression (configured in nginx)
- [ ] Set appropriate cache headers
- [ ] Monitor and optimize database queries
- [ ] Consider CDN for static assets (if needed)

## Backup & Recovery

- [ ] Database backups are configured
- [ ] Environment variables are documented
- [ ] Deployment process is documented
- [ ] Rollback procedures are tested

## Final Verification

- [ ] Application is accessible via Railway URLs
- [ ] All core functionality works
- [ ] Performance is acceptable
- [ ] Error handling works correctly
- [ ] Logs are being generated properly

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Railway Project URL**: _______________
**Backend Service URL**: _______________
**Frontend Service URL**: _______________
**Database URL**: _______________

**Notes**: _______________
