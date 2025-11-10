# ⚡ Quick Deployment Checklist

## Before You Start

Gather these credentials first:

### MongoDB Atlas
- [ ] Connection String (MONGODB_URI)
- [ ] Network Access set to 0.0.0.0/0 (Allow from Anywhere)

### Cloudinary
- [ ] Cloud Name
- [ ] API Key  
- [ ] API Secret

### JWT Secret
- [ ] Generate a random 32+ character string
- [ ] Example: `my_super_secret_jwt_key_12345_change_this_in_production`

---

## Deployment Steps

### 1️⃣ Deploy API Backend (First)

**Vercel Settings:**
- Project Name: `zargon-inventory-api`
- Framework: Other
- Root Directory: `api`
- Build Command: `npm run build`

**Environment Variables:**
```
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/zargoninventory
MONGODB_MIRROR_URI = mongodb+srv://username:password@cluster.mongodb.net/zargoninventory
FRONTEND_URL = https://zargon-inventory-web.vercel.app
JWT_SECRET = your_32_character_secret_key
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY = your_api_key
CLOUDINARY_API_SECRET = your_api_secret
PORT = 5000
```

**After Deploy:**
- [ ] Save API URL: `https://_____________________.vercel.app`
- [ ] Test API: Visit `https://your-api-url.vercel.app/api/test`

---

### 2️⃣ Deploy Web Frontend (Second)

**Vercel Settings:**
- Project Name: `zargon-inventory-web`
- Framework: Next.js
- Root Directory: `web`
- Build Command: `npm run build`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL = https://your-api-url-from-step-1.vercel.app
```

**After Deploy:**
- [ ] Save Frontend URL: `https://_____________________.vercel.app`

---

### 3️⃣ Update API Configuration

**Go back to API project and update:**
- [ ] Update `FRONTEND_URL` to actual frontend URL
- [ ] Redeploy API project

---

### 4️⃣ Test Everything

Visit your frontend URL and test:
- [ ] Can open the website
- [ ] Can register a new user
- [ ] Can login
- [ ] Can create inventory items
- [ ] Can upload images
- [ ] Can create orders
- [ ] Can view reports
- [ ] Can see analytics

---

## Common Issues

### ❌ "Failed to fetch" error
→ Check `NEXT_PUBLIC_API_URL` in frontend settings  
→ Check browser console for CORS errors  
→ Verify API is running

### ❌ "MongoDB connection failed"
→ Check `MONGODB_URI` is correct  
→ Verify Network Access in MongoDB Atlas (0.0.0.0/0)  
→ Check MongoDB Atlas cluster is running

### ❌ "Image upload failed"
→ Verify all Cloudinary credentials  
→ Check API logs in Vercel

### ❌ Build errors
→ Read Vercel build logs  
→ Check for TypeScript errors  
→ Verify all dependencies in package.json

---

## Important URLs to Save

| Service | URL |
|---------|-----|
| Frontend | https://_____________________.vercel.app |
| Backend API | https://_____________________.vercel.app |
| MongoDB Atlas | https://cloud.mongodb.com |
| Cloudinary | https://cloudinary.com/console |
| Vercel Dashboard | https://vercel.com/dashboard |

---

## Post-Deployment

- [ ] Record both URLs above
- [ ] Bookmark Vercel dashboard
- [ ] Enable automatic deployments on push
- [ ] Set up monitoring
- [ ] Share URLs with team/users

---

**Need detailed steps?** See `VERCEL_DEPLOYMENT_GUIDE.md`

**Deployed:** November 10, 2025
