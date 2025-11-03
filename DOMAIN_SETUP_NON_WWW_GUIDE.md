# 🌐 Domain Setup Guide - Non-WWW Configuration

## ✅ **What I've Updated**

1. **Nginx Configuration** (`frontend/nginx.conf`)
   - Added redirect from `www.countryside-steakhouse.site` → `countryside-steakhouse.site`
   - Railway handles SSL termination, so redirect works automatically

2. **Backend CORS** (`backend/server.js`)
   - Added both `www` and non-`www` domains to allowed origins
   - Includes both HTTP and HTTPS variants

## 🔧 **Railway Configuration**

### **Current Status:**
- ✅ `www.countryside-steakhouse.site` - **Setup complete**
- ⏳ `countryside-steakhouse.site` (apex) - **Waiting for DNS update**

### **What You Need to Do:**

#### **Step 1: Verify DNS Records in Hostinger**

Your DNS records should look like this:

```
Type      Name    Value                               TTL
ALIAS     @       y1nxes5d.up.railway.app            300
CNAME     www     y1nxes5d.up.railway.app            300
```

✅ **This is already correct!**

#### **Step 2: Wait for DNS Propagation**

Railway is showing "Waiting for DNS update" for the apex domain because:
- DNS propagation can take **5 minutes to 48 hours** (usually 15-30 minutes)
- Railway needs to verify the DNS record is pointing to their servers

**How to Check DNS Propagation:**
1. Go to https://dnschecker.org/
2. Enter: `countryside-steakhouse.site`
3. Select record type: **A** or **CNAME**
4. Check if it shows `y1nxes5d.up.railway.app` globally

#### **Step 3: Railway Domain Verification**

In Railway dashboard:
1. Go to your **Frontend Service** → **Settings** → **Domains**
2. Both domains should be added:
   - `countryside-steakhouse.site` (apex)
   - `www.countryside-steakhouse.site` (subdomain)

3. Wait for Railway to verify (status should change to "Setup complete")
   - Railway will automatically issue SSL certificates once DNS is verified

#### **Step 4: Test the Redirect**

Once DNS is verified and Railway shows "Setup complete":

1. **Test non-www domain:**
   ```
   https://countryside-steakhouse.site
   ```
   Should load your site ✅

2. **Test www redirect:**
   ```
   https://www.countryside-steakhouse.site
   ```
   Should automatically redirect to `https://countryside-steakhouse.site` ✅

3. **Test in browser:**
   - Open Developer Tools (F12)
   - Network tab
   - Visit `www.countryside-steakhouse.site`
   - Should see **301 Permanent Redirect** to non-www version

## 🚨 **Troubleshooting**

### **If apex domain still shows "Waiting for DNS update":**

1. **Double-check DNS in Hostinger:**
   - ALIAS record for `@` must point to `y1nxes5d.up.railway.app`
   - TTL should be 300 (5 minutes) for faster propagation

2. **Clear DNS cache:**
   - Windows: `ipconfig /flushdns` in PowerShell
   - Wait 5-10 minutes and check again

3. **Verify Railway configuration:**
   - Make sure you added the apex domain in Railway
   - Railway should show verification instructions if DNS isn't working

4. **Check Railway logs:**
   - Go to Railway → Frontend Service → Deployments → View logs
   - Look for domain verification errors

### **If www doesn't redirect to non-www:**

1. **Rebuild frontend service in Railway:**
   - The nginx.conf changes need to be deployed
   - Railway will rebuild automatically when you push to GitHub
   - Or trigger a manual rebuild in Railway dashboard

2. **Check nginx configuration is being used:**
   - Verify Railway is using your Dockerfile/npm script that uses nginx
   - Check that `nginx.conf` is copied to the container

## 📝 **How It Works**

1. **User visits `www.countryside-steakhouse.site`:**
   - DNS resolves to Railway server
   - Railway terminates SSL and passes HTTP to nginx
   - Nginx sees `www` subdomain and redirects (301) to non-www version
   - User's browser follows redirect to `countryside-steakhouse.site`

2. **User visits `countryside-steakhouse.site`:**
   - DNS resolves to Railway server
   - Railway terminates SSL and passes HTTP to nginx
   - Nginx serves the Vue.js app normally

## 🔄 **Next Steps**

1. **Wait for DNS propagation** (check dnschecker.org)
2. **Wait for Railway to verify** the apex domain (check Railway dashboard)
3. **Deploy the updated code** (push to GitHub or rebuild in Railway)
4. **Test both domains** once Railway shows "Setup complete"

---

**Note:** The redirect is already configured in `nginx.conf`. Once DNS propagates and Railway verifies the domain, everything should work automatically! 🚀

