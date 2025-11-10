# Vercel Deployment Guide for Zargon Inventory

## Step-by-Step Deployment Process

### Step 1: Push Code to GitHub

First, make sure all your code is committed and pushed to GitHub:

```bash
cd E:\courses\zargoninventorybysadmansakib\zargoninventory

git add .
git commit -m "Ready for Vercel deployment"
git remote add origin https://github.com/mohaimin2103001/zargoninventorymanagement.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Frontend (Web) to Vercel

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Click "Login" or "Sign Up" (use GitHub account)

2. **Import Project:**
   - Click "Add New Project"
   - Click "Import Git Repository"
   - Select: `mohaimin2103001/zargoninventorymanagement`
   - Click "Import"

3. **Configure Project:**
   - **Project Name:** `zargon-inventory-web` (or your preferred name)
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** Click "Edit" → Select `web`
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Add Environment Variables:**
   Click "Environment Variables" and add:
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_API_URL` | `https://your-api-url.vercel.app` | Production |
   
   *Note: You'll update this after deploying the API*

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Note your deployment URL: `https://zargon-inventory-web.vercel.app`

### Step 3: Deploy Backend (API) to Vercel

1. **Create New Project:**
   - Go back to Vercel dashboard
   - Click "Add New Project"
   - Import the SAME repository again: `mohaimin2103001/zargoninventorymanagement`

2. **Configure API Project:**
   - **Project Name:** `zargon-inventory-api`
   - **Framework Preset:** Other
   - **Root Directory:** Click "Edit" → Select `api`
   - **Build Command:** `npm run build` or leave empty
   - **Output Directory:** Leave empty
   - **Install Command:** `npm install`

3. **Add API Environment Variables:**
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string | Production |
   | `JWT_SECRET` | Your secret key (e.g., `your_super_secret_key_12345`) | Production |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | Production |
   | `CLOUDINARY_API_KEY` | Your Cloudinary API key | Production |
   | `CLOUDINARY_API_SECRET` | Your Cloudinary API secret | Production |
   | `PORT` | `5000` | Production |

4. **Deploy API:**
   - Click "Deploy"
   - Wait for deployment
   - Note your API URL: `https://zargon-inventory-api.vercel.app`

### Step 4: Update Frontend Environment Variables

1. Go to your **Web project** in Vercel
2. Go to Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` to your actual API URL:
   ```
   NEXT_PUBLIC_API_URL=https://zargon-inventory-api.vercel.app
   ```
4. Redeploy the frontend (Vercel → Deployments → ⋮ → Redeploy)

### Step 5: Configure MongoDB Atlas

1. **Go to MongoDB Atlas:**
   - Visit https://cloud.mongodb.com
   - Log in to your account

2. **Create Database:**
   - Create a cluster if you don't have one
   - Database name: `zargoninventory`

3. **Get Connection String:**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password
   - Use this as your `MONGODB_URI`

4. **Configure Network Access:**
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

### Step 6: Configure Cloudinary

1. **Go to Cloudinary:**
   - Visit https://cloudinary.com
   - Log in or sign up

2. **Get Credentials:**
   - Go to Dashboard
   - Note your:
     - Cloud Name
     - API Key
     - API Secret
   - Use these in your Vercel environment variables

### Step 7: Test Your Deployment

1. Visit your frontend URL: `https://zargon-inventory-web.vercel.app`
2. Try to login/register
3. Test all features:
   - Stock management
   - Orders
   - Reports
   - Analytics
   - Image uploads

### Troubleshooting

**Issue: API not connecting**
- Check NEXT_PUBLIC_API_URL is set correctly
- Verify API is deployed and running
- Check browser console for CORS errors

**Issue: Database connection failed**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas allows access from 0.0.0.0/0
- Ensure password doesn't have special characters (URL encode if needed)

**Issue: Image upload not working**
- Verify Cloudinary credentials
- Check API logs in Vercel

**Issue: Build failed**
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Verify TypeScript has no errors

### Useful Commands

```bash
# Check deployment status
vercel --prod

# View logs
vercel logs

# Redeploy
vercel --prod --force
```

### Important Notes

- Free Vercel plan has serverless function timeout of 10 seconds
- Keep your `.env` files secure and never commit them
- Update environment variables in Vercel when values change
- Monitor your MongoDB Atlas and Cloudinary usage

---

## Your Deployed URLs (Update After Deployment)

- **Frontend:** https://_____.vercel.app
- **API:** https://_____.vercel.app

---

**Deployed by:** Md Wariul Mohaimin  
**Date:** November 10, 2025
