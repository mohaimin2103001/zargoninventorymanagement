# 🔧 Vercel Deployment Troubleshooting Guide

## Common Errors & Solutions

---

## ❌ API Deployment Issues

### Error: "Module not found" or "Cannot find module"

**Cause:** Missing dependencies in package.json

**Solution:**
```powershell
cd api
npm install
npm run build  # Test build locally first
```

Make sure all imports are in `package.json` dependencies.

---

### Error: "MONGODB_URI is not defined"

**Cause:** Environment variables not set in Vercel

**Solution:**
1. Go to Vercel Dashboard → Your API Project
2. Settings → Environment Variables
3. Add all required variables (see QUICK_DEPLOYMENT_CHECKLIST.md)
4. Redeploy: Deployments → ⋮ → Redeploy

---

### Error: "MongooseServerSelectionError" or "Could not connect to MongoDB"

**Cause:** MongoDB Atlas not allowing connections from Vercel

**Solution:**
1. Go to MongoDB Atlas: https://cloud.mongodb.com
2. Click "Network Access" in left sidebar
3. Click "Add IP Address"
4. Select "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"
6. Wait 1-2 minutes for changes to propagate
7. Redeploy your API

---

### Error: "Serverless Function has timed out"

**Cause:** Function taking longer than 10 seconds (Vercel free tier limit)

**Solution:**
- Optimize database queries
- Add indexes to MongoDB collections
- Consider upgrading Vercel plan
- Check for infinite loops in code

---

## ❌ Frontend Deployment Issues

### Error: "Failed to compile" during build

**Cause:** TypeScript errors or missing dependencies

**Solution:**
```powershell
cd web
npm install
npm run build  # Test build locally
```

Fix any TypeScript errors shown in the output.

---

### Error: "NEXT_PUBLIC_API_URL is not defined"

**Cause:** Environment variable not set in Vercel

**Solution:**
1. Go to Vercel Dashboard → Your Web Project
2. Settings → Environment Variables
3. Add: `NEXT_PUBLIC_API_URL` = `https://your-api-url.vercel.app`
4. Important: No trailing slash!
5. Redeploy

---

### Error: "Failed to fetch" in browser console

**Cause:** API URL is wrong or CORS issue

**Solution:**
1. Open browser console (F12)
2. Check the exact error message
3. Verify `NEXT_PUBLIC_API_URL` in Vercel settings
4. Make sure API is deployed and running
5. Check API has correct `FRONTEND_URL` in its environment variables

---

## ❌ CORS Errors

### Error: "Access-Control-Allow-Origin" or "CORS policy"

**Cause:** API doesn't allow requests from your frontend domain

**Solution:**
1. Go to Vercel Dashboard → Your API Project
2. Settings → Environment Variables
3. Update `FRONTEND_URL` to your actual frontend URL
4. Must be exact: `https://zargon-inventory-web.vercel.app` (no trailing slash)
5. Redeploy API

**Verify CORS in code:** Check `api/src/server.ts` has:
```typescript
app.use(cors({
  origin: [process.env.FRONTEND_URL],
  credentials: true
}));
```

---

## ❌ Image Upload Issues

### Error: "Cloudinary upload failed"

**Cause:** Incorrect Cloudinary credentials

**Solution:**
1. Go to https://cloudinary.com/console
2. Copy your credentials:
   - Cloud Name
   - API Key
   - API Secret
3. Go to Vercel Dashboard → API Project → Settings → Environment Variables
4. Verify all three are correct:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
5. Redeploy

---

### Error: "Request entity too large"

**Cause:** Image file is too large

**Solution:**
- Compress images before upload
- Maximum file size: 10MB recommended
- Use image compression tools

---

## ❌ Authentication Issues

### Error: "Invalid token" or "Authentication failed"

**Cause:** JWT_SECRET mismatch or not set

**Solution:**
1. Go to Vercel Dashboard → API Project
2. Settings → Environment Variables
3. Check `JWT_SECRET` exists and is at least 32 characters
4. If you changed it, users need to login again
5. Redeploy API

---

### Error: "User not found" or "Cannot read property 'role'"

**Cause:** Database is empty or user not created

**Solution:**
1. Visit your frontend
2. Register a new user first
3. Check MongoDB Atlas that user was created:
   - Go to MongoDB Atlas → Browse Collections
   - Check `zargoninventory.users` collection

---

## ❌ Database Issues

### Error: "E11000 duplicate key error"

**Cause:** Trying to create duplicate record

**Solution:**
- This is normal if email/username already exists
- Use different credentials
- Or delete the existing record from MongoDB

---

### Error: "ValidationError" from Mongoose

**Cause:** Missing required fields in form

**Solution:**
- Check all required fields are filled
- Verify frontend is sending all required data
- Check model schemas in `api/src/models/`

---

## 🔍 Debugging Tips

### View API Logs
1. Go to Vercel Dashboard
2. Select your API project
3. Click "Logs" tab
4. See real-time errors and console.log output

### View Frontend Logs
1. Browser Console (F12) → Console tab
2. Network tab to see API requests/responses
3. Vercel Dashboard → Web Project → Logs

### Test API Directly
Visit your API endpoints in browser:
- `https://your-api.vercel.app/api/test`
- `https://your-api.vercel.app/api/health`

### Check Environment Variables
```powershell
# List all environment variables (locally)
vercel env ls
```

---

## 📋 Pre-Deployment Checklist

Before deploying, verify:

- [ ] Code builds locally without errors
- [ ] All environment variables documented
- [ ] MongoDB Atlas configured (Network Access)
- [ ] Cloudinary account active
- [ ] No `.env` files committed to Git
- [ ] `package.json` has all dependencies
- [ ] No hardcoded URLs (use environment variables)

---

## 🆘 Still Having Issues?

### Check These Files:
1. `VERCEL_DEPLOYMENT_GUIDE.md` - Step-by-step deployment
2. `QUICK_DEPLOYMENT_CHECKLIST.md` - Quick reference
3. `START_HERE_DEPLOYMENT.md` - Overview

### Useful Resources:
- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- MongoDB Docs: https://docs.atlas.mongodb.com
- Next.js Docs: https://nextjs.org/docs

### Get Help:
1. Check Vercel build logs (most detailed error info)
2. Check browser console for frontend errors
3. Test API endpoints directly
4. Verify all environment variables are set
5. Compare local vs. production behavior

---

## ✅ Successful Deployment Signs

You should see:
- ✅ Green checkmark in Vercel deployments
- ✅ Frontend loads without errors
- ✅ Can register/login
- ✅ Can create inventory items
- ✅ Images upload successfully
- ✅ Orders can be created
- ✅ Reports generate correctly
- ✅ No errors in browser console
- ✅ No errors in Vercel logs

---

**Last Updated:** November 10, 2025

**Need immediate help?** Check the Vercel build logs first - they contain the most detailed error information!
