# Vercel Deployment Checklist

## Before Deployment

- [ ] MongoDB Atlas account created
- [ ] MongoDB database created and accessible
- [ ] MongoDB connection string obtained
- [ ] Network access configured (0.0.0.0/0)
- [ ] Cloudinary account created
- [ ] Cloudinary credentials noted (Cloud Name, API Key, API Secret)
- [ ] GitHub repository ready: `mohaimin2103001/zargoninventorymanagement`
- [ ] All code committed and pushed to `main` branch
- [ ] Vercel account created (or logged in with GitHub)

## Deployment Steps

### Frontend Deployment
- [ ] Created new Vercel project for web
- [ ] Selected correct repository
- [ ] Set root directory to `web`
- [ ] Added environment variable: `NEXT_PUBLIC_API_URL` (temporary)
- [ ] Deployed successfully
- [ ] Noted frontend URL: `________________`

### Backend Deployment
- [ ] Created new Vercel project for API
- [ ] Selected correct repository
- [ ] Set root directory to `api`
- [ ] Added environment variables:
  - [ ] `MONGODB_URI`
  - [ ] `JWT_SECRET`
  - [ ] `CLOUDINARY_CLOUD_NAME`
  - [ ] `CLOUDINARY_API_KEY`
  - [ ] `CLOUDINARY_API_SECRET`
  - [ ] `PORT`
- [ ] Deployed successfully
- [ ] Noted API URL: `________________`

### Final Configuration
- [ ] Updated frontend `NEXT_PUBLIC_API_URL` with actual API URL
- [ ] Redeployed frontend
- [ ] Tested login functionality
- [ ] Tested stock management
- [ ] Tested order creation
- [ ] Tested image upload
- [ ] Tested all dashboard pages

## Environment Variables Reference

### Web (Frontend)
```
NEXT_PUBLIC_API_URL=https://your-api.vercel.app
```

### API (Backend)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zargoninventory
JWT_SECRET=your_super_secret_jwt_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=5000
```

## Post-Deployment

- [ ] All features working correctly
- [ ] No console errors
- [ ] Images uploading successfully
- [ ] Database operations working
- [ ] Shared deployment URLs with team/users

## Useful Links

- Vercel Dashboard: https://vercel.com/dashboard
- MongoDB Atlas: https://cloud.mongodb.com
- Cloudinary: https://cloudinary.com/console
- GitHub Repo: https://github.com/mohaimin2103001/zargoninventorymanagement

---

**Developer:** Md Wariul Mohaimin  
**Phone:** 01751154790  
**Date:** _________________
