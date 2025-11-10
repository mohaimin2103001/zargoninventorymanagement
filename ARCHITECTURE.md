# 🏗️ Zargon Inventory - Deployment Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL CLOUD                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐       ┌─────────────────────┐     │
│  │   Frontend (Web)    │       │   Backend (API)     │     │
│  │  Next.js 15 App     │◄─────►│  Express + Node.js  │     │
│  │                     │       │                     │     │
│  │  zargon-web.        │       │  zargon-api.        │     │
│  │  vercel.app         │       │  vercel.app         │     │
│  └─────────────────────┘       └─────────────────────┘     │
│           │                              │                   │
│           │                              │                   │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            │                              ├──────────────┐
            │                              │              │
            │                              ▼              ▼
            │                    ┌───────────────┐  ┌─────────────┐
            │                    │ MongoDB Atlas │  │ Cloudinary  │
            │                    │  (Database)   │  │   (Images)  │
            └────────────────────┤               │  │             │
                    Uses API     │  Primary DB   │  │  Image CDN  │
                                 │  + Mirror DB  │  │             │
                                 └───────────────┘  └─────────────┘
```

---

## Component Details

### 1. Frontend (Web Application)
- **Technology:** Next.js 15 + React 19 + TypeScript
- **Location:** `web/` folder
- **Deployed to:** Vercel (Separate Project)
- **URL Pattern:** `https://zargon-inventory-web.vercel.app`
- **Purpose:** User interface for inventory management

**Key Features:**
- 📊 Dashboard & Analytics
- 📦 Inventory Management
- 🛒 Order Processing
- 👥 User Management
- 📈 Reports & Export
- 🔔 Real-time Notifications

---

### 2. Backend (API Server)
- **Technology:** Express.js + Node.js + TypeScript
- **Location:** `api/` folder
- **Deployed to:** Vercel (Separate Project)
- **URL Pattern:** `https://zargon-inventory-api.vercel.app`
- **Purpose:** Business logic, data processing, authentication

**Key Features:**
- 🔐 JWT Authentication
- 🗄️ Database Operations
- 📤 File Upload (Cloudinary)
- 📊 Analytics Processing
- 🔄 Backup & Mirror System
- 📝 Activity Logging

---

### 3. MongoDB Atlas (Database)
- **Type:** NoSQL Document Database
- **Location:** Cloud (MongoDB Atlas)
- **Access:** Via connection string
- **Purpose:** Store all application data

**Collections:**
- 👤 users - User accounts & roles
- 📦 inventoryitems - Products & stock
- 🛒 orders - Customer orders
- 🔔 notices - System announcements
- 📋 useractivities - Activity logs

**Backup Strategy:**
- Primary Database: `MONGODB_URI`
- Mirror Database: `MONGODB_MIRROR_URI`
- Auto-failover enabled

---

### 4. Cloudinary (Image Storage)
- **Type:** Cloud Image Management
- **Location:** Cloud (Cloudinary)
- **Purpose:** Store & serve product images

**Features:**
- 🖼️ Image Upload
- 📐 Auto Resize
- ⚡ CDN Delivery
- 🔄 Transformations

---

## Data Flow

### User Registration/Login
```
User → Frontend → API → MongoDB → API → Frontend → User
                  ↓
                JWT Token Generated
```

### Create Inventory Item with Image
```
User → Frontend → API → Cloudinary (Upload Image)
                  ↓                    ↓
               MongoDB ← Image URL ────┘
                  ↓
              Frontend ← Success Response
```

### View Reports
```
User → Frontend → API → MongoDB (Query Data)
                  ↓                ↓
              Generate Report      │
                  ↓                │
              Frontend ← Data ─────┘
```

---

## Environment Variables Flow

### Frontend Environment Variables
```
NEXT_PUBLIC_API_URL → Points to Backend API URL
                      Used for all API requests
```

### Backend Environment Variables
```
MONGODB_URI          → Primary database connection
MONGODB_MIRROR_URI   → Backup database connection
FRONTEND_URL         → For CORS configuration
JWT_SECRET           → For authentication tokens
CLOUDINARY_*         → For image uploads
```

---

## Deployment Workflow

### Initial Deployment
```
1. Push code to GitHub
   ↓
2. Deploy API to Vercel
   - Configure environment variables
   - Note API URL
   ↓
3. Deploy Web to Vercel
   - Set NEXT_PUBLIC_API_URL
   - Note Web URL
   ↓
4. Update API's FRONTEND_URL
   - Add Web URL
   - Redeploy API
   ↓
5. Test everything! ✅
```

### Continuous Deployment (After Setup)
```
1. Make code changes locally
   ↓
2. Commit and push to GitHub
   ↓
3. Vercel auto-deploys both projects
   ↓
4. Changes live in ~2 minutes! ✅
```

---

## Security Architecture

### Authentication Flow
```
1. User logs in
2. API validates credentials
3. API generates JWT token
4. Frontend stores token
5. All requests include token
6. API verifies token
7. API processes request
```

### CORS Protection
```
Frontend (zargon-web.vercel.app)
   ↓ Request with credentials
API checks FRONTEND_URL
   ↓ Match? → Allow
   ↓ No match? → Reject (CORS Error)
Response sent back
```

---

## Scaling & Performance

### Vercel Auto-Scaling
- 🌍 Global CDN
- ⚡ Edge Functions
- 🔄 Auto-scaling based on traffic
- 💾 Serverless architecture

### Database Optimization
- 📊 Indexes on frequently queried fields
- 🔄 Connection pooling
- 💾 Efficient queries with Mongoose
- 🔁 Backup/mirror for failover

### Image Optimization
- 🖼️ Cloudinary CDN
- 📐 Auto-format (WebP, AVIF)
- ⚡ Lazy loading
- 🔄 Responsive images

---

## Monitoring & Logs

### Where to Check Logs

**Frontend Errors:**
- Browser Console (F12)
- Vercel Dashboard → Web Project → Logs

**Backend Errors:**
- Vercel Dashboard → API Project → Logs
- Real-time function logs

**Database Issues:**
- MongoDB Atlas → Metrics
- Connection logs

**Image Upload Issues:**
- Cloudinary → Media Library
- Upload logs

---

## Cost Breakdown (Free Tier)

| Service | Free Tier Limits |
|---------|------------------|
| **Vercel** | 100GB bandwidth/month, Unlimited deployments |
| **MongoDB Atlas** | 512MB storage, Shared cluster |
| **Cloudinary** | 25 GB storage, 25 GB bandwidth/month |
| **GitHub** | Unlimited public repos |

**Total Monthly Cost:** $0 (on free tiers)

---

## URLs & Access Points

After deployment, you'll have:

| Purpose | URL Pattern | Example |
|---------|-------------|---------|
| **Main App** | `https://[project].vercel.app` | User interface |
| **API** | `https://[api].vercel.app` | Backend services |
| **API Test** | `https://[api].vercel.app/api/test` | Health check |
| **Database** | MongoDB Atlas Dashboard | Data management |
| **Images** | Cloudinary Dashboard | Media management |
| **Deployments** | Vercel Dashboard | Manage deployments |

---

## Quick Reference Commands

```powershell
# Check Vercel CLI
vercel --version

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# View logs
vercel logs [url]

# List environment variables
vercel env ls
```

---

## Success Indicators

After successful deployment:

✅ **Frontend:**
- Loads without errors
- Shows login/register page
- UI is responsive
- No console errors

✅ **Backend:**
- API responds to requests
- Authentication works
- Database queries succeed
- Images upload successfully

✅ **Integration:**
- Frontend talks to API
- Data persists in database
- Images display correctly
- All features functional

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. 📝 Document your deployment URLs
3. 👥 Create admin user account
4. 📊 Monitor Vercel analytics
5. 🔄 Set up automatic backups
6. 📱 Share with users/team
7. 🎉 Celebrate successful deployment!

---

**Architecture designed for:** Scalability, Reliability, Security, Performance

**Last Updated:** November 10, 2025
