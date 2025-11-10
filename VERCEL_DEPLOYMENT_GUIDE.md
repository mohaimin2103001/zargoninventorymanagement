# 🚀 Complete Vercel Deployment Guide - Zargon Inventory

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ GitHub account with your code pushed
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ MongoDB Atlas account with connection string
- ✅ Cloudinary account with API credentials

---

## 🎯 Deployment Strategy

We'll deploy TWO separate projects:
1. **API Backend** → `zargon-inventory-api.vercel.app`
2. **Web Frontend** → `zargon-inventory-web.vercel.app`

---

## 📦 PART 1: Deploy Backend API

### Step 1.1: Go to Vercel Dashboard

1. Visit https://vercel.com
2. Click "Login" and sign in with GitHub
3. Click "Add New..." → "Project"

### Step 1.2: Import Repository

1. Click "Import Git Repository"
2. Find and select: `mohaimin2103001/zargoninventorymanagement`
3. Click "Import"

### Step 1.3: Configure API Project

**IMPORTANT:** Fill these settings carefully:

| Setting | Value |
|---------|-------|
| **Project Name** | `zargon-inventory-api` |
| **Framework Preset** | Other |
| **Root Directory** | Click "Edit" → Select **`api`** folder |
| **Build Command** | `npm run build` |
| **Output Directory** | (leave empty) |
| **Install Command** | `npm install` |

### Step 1.4: Add Environment Variables

Click "Environment Variables" and add these ONE BY ONE:

```
MONGODB_URI
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/zargoninventory?retryWrites=true&w=majority

MONGODB_MIRROR_URI
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/zargoninventory?retryWrites=true&w=majority

FRONTEND_URL
https://zargon-inventory-web.vercel.app

JWT_SECRET
your_random_secret_key_min_32_characters_long

CLOUDINARY_CLOUD_NAME
your_cloudinary_cloud_name

CLOUDINARY_API_KEY
your_cloudinary_api_key

CLOUDINARY_API_SECRET
your_cloudinary_api_secret

PORT
5000
```

**Important Notes:**
- Replace `YOUR_USERNAME`, `YOUR_PASSWORD`, `YOUR_CLUSTER` with your MongoDB Atlas details
- `MONGODB_MIRROR_URI` can be the same as `MONGODB_URI` (backup database connection)
- `FRONTEND_URL` will be your web app URL (you'll update this after deploying frontend)
- Generate a strong JWT_SECRET (at least 32 characters)
- Get Cloudinary credentials from https://cloudinary.com/console

### Step 1.5: Deploy API

1. Click "Deploy" button
2. Wait 2-3 minutes for build to complete
3. **Save your API URL**: `https://zargon-inventory-api.vercel.app`
   (or whatever name you chose)

### Step 1.6: Verify API is Running

Visit: `https://your-api-url.vercel.app/api/test`

You should see a success message or health check response.

---

## 🌐 PART 2: Deploy Frontend Web

### Step 2.1: Create New Project

1. Go back to Vercel Dashboard
2. Click "Add New..." → "Project"
3. Import the SAME repository: `mohaimin2103001/zargoninventorymanagement`

### Step 2.2: Configure Web Project

| Setting | Value |
|---------|-------|
| **Project Name** | `zargon-inventory-web` |
| **Framework Preset** | Next.js (auto-detected) |
| **Root Directory** | Click "Edit" → Select **`web`** folder |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |

### Step 2.3: Add Frontend Environment Variable

Add this ONE environment variable:

```
NEXT_PUBLIC_API_URL
https://your-api-url-from-step-1.vercel.app
```

**CRITICAL:** Use the EXACT API URL from Step 1.5 (without trailing slash)

### Step 2.4: Deploy Web

1. Click "Deploy"
2. Wait 2-3 minutes
3. **Save your Frontend URL**: `https://zargon-inventory-web.vercel.app`

### Step 2.5: Update API Environment Variables

**IMPORTANT:** Now that you have your frontend URL, go back and update the API:

1. Go to Vercel Dashboard
2. Open your **API project** (`zargon-inventory-api`)
3. Go to Settings → Environment Variables
4. Find `FRONTEND_URL` and click "Edit"
5. Update it to your actual frontend URL: `https://zargon-inventory-web.vercel.app`
6. Click "Save"
7. Go to Deployments → Click ⋮ (three dots) → Click "Redeploy"

This step is crucial for CORS to work properly!

---

## ✅ PART 3: Post-Deployment Setup

### 3.1: Configure MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Navigate to **Network Access**
3. Click "Add IP Address"
4. Click "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"

### 3.2: Configure CORS (if needed)

Your API should already have CORS configured, but verify in `api/src/server.ts` that it allows your frontend domain.

### 3.3: Test Your Deployment

1. Visit your frontend URL: `https://zargon-inventory-web.vercel.app`
2. Try to register a new user
3. Login with credentials
4. Test features:
   - ✅ Create inventory item
   - ✅ Upload image
   - ✅ Create order
   - ✅ View reports
   - ✅ Check analytics

---

## 🔧 Troubleshooting

### Problem: "Failed to fetch" or API errors

**Solution:**
1. Check browser console (F12)
2. Verify `NEXT_PUBLIC_API_URL` is correct in Vercel
3. Ensure API is deployed and running
4. Check API logs: Vercel Dashboard → API Project → Logs

### Problem: MongoDB connection failed

**Solution:**
1. Verify `MONGODB_URI` is correct
2. Check MongoDB Atlas allows 0.0.0.0/0 in Network Access
3. Ensure password doesn't have special characters (or URL encode them)
4. Test connection string locally first

### Problem: Image upload not working

**Solution:**
1. Verify all Cloudinary environment variables are correct
2. Check Cloudinary dashboard for usage/errors
3. View API logs for Cloudinary-specific errors

### Problem: Build failed

**Solution:**
1. Check Vercel build logs for specific error
2. Ensure all dependencies are in `package.json`
3. Fix any TypeScript errors
4. Try building locally first: `npm run build`

### Problem: Environment variables not working

**Solution:**
1. Go to Vercel Project → Settings → Environment Variables
2. Verify all variables are set correctly
3. After changing variables, **redeploy**: Deployments → ⋮ → Redeploy

---

## 📝 Important Notes

### Vercel Free Tier Limits:
- ⏱️ Serverless function timeout: 10 seconds
- 💾 100GB bandwidth per month
- 🚀 Unlimited deployments

### Security Best Practices:
- 🔐 Never commit `.env` files to Git
- 🔑 Use strong JWT_SECRET (32+ characters)
- 🛡️ Keep MongoDB and Cloudinary credentials secure
- 🔄 Rotate secrets periodically

### Maintenance:
- 📊 Monitor Vercel Analytics
- 📈 Check MongoDB Atlas usage
- 🖼️ Monitor Cloudinary storage
- 🔍 Review deployment logs regularly

---

## 🎉 Success Checklist

After deployment, you should be able to:

- [ ] Access frontend URL
- [ ] Register a new user
- [ ] Login successfully
- [ ] Create inventory items
- [ ] Upload product images
- [ ] Create and manage orders
- [ ] View analytics dashboard
- [ ] Generate reports
- [ ] All features working without errors

---

## 📞 Quick Commands

### View Deployment Status
```bash
vercel
```

### View Logs
```bash
vercel logs https://your-project.vercel.app
```

### Redeploy
```bash
vercel --prod
```

---

## 🔗 Your Deployment URLs

After deployment, record your URLs here:

- **Frontend:** https://_____________________.vercel.app
- **Backend API:** https://_____________________.vercel.app

---

## 🚀 Continuous Deployment

Vercel automatically redeploys when you push to GitHub:

1. Make changes to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Vercel automatically builds and deploys

---

**Deployment Date:** November 10, 2025  
**Deployed by:** Md Wariul Mohaimin

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Cloudinary Docs: https://cloudinary.com/documentation

Good luck with your deployment! 🎊
