# 🚂 Quick Start: Deploy to Railway

Get your Thesis-B application running on Railway in minutes!

## ⚡ Super Quick Deployment

### Option 1: Use the Windows Script (Recommended)
```bash
# Just double-click this file:
deploy-railway.bat
```

### Option 2: Manual Steps
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Deploy backend
cd backend
railway up

# 5. Deploy frontend
cd ../frontend
railway up
```

## 🔑 Required Environment Variables

Set these in your Railway dashboard:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5000` | Server port |
| `DATABASE_URL` | `your_railway_postgres_url` | Database connection |
| `JWT_SECRET` | `auto-generated` | JWT signing secret |
| `CORS_ORIGIN` | `your_frontend_url` | Frontend domain |

## 🗄️ Database Setup

1. Create PostgreSQL database in Railway
2. Copy the `DATABASE_URL` from the Connect tab
3. Set it as an environment variable
4. Run migrations: `railway run npm run migrate`

## 🌐 Service URLs

After deployment, you'll get:
- **Backend**: `https://your-backend-service.railway.app`
- **Frontend**: `https://your-frontend-service.railway.app`

## ✅ Test Your Deployment

1. **Backend Health**: Visit `/api/health`
2. **Frontend**: Visit your frontend URL
3. **API Docs**: Visit `/api-docs` on backend

## 🆘 Need Help?

- 📖 Full Guide: `RAILWAY_DEPLOYMENT.md`
- ✅ Checklist: `DEPLOYMENT_CHECKLIST.md`
- 🐛 Issues: Check Railway dashboard logs

---

**Ready to deploy?** Just run `deploy-railway.bat`! 🚀
