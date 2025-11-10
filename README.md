# Zargon Inventory Management System

A comprehensive inventory management system for tracking stock, orders, and customer data.

## Developer Information

**Developer:** Md Wariul Mohaimin  
**Department:** Computer Science & Engineering (CSE)  
**Institution:** Rajshahi University of Engineering & Technology  
**Series:** 21 Series  
**ID No:** 2103001  
**Phone:** 01751154790  

**Special Thanks:** Sadman Sakib for support and guidance in this project.

## Tech Stack

- **Frontend:** Next.js 15.4.7, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB
- **Image Storage:** Cloudinary
- **Deployment:** Vercel

## Project Structure

```
zargoninventory/
├── api/          # Backend API server
└── web/          # Next.js frontend application
```

## Deployment on Vercel

### Prerequisites

1. GitHub account with this repository
2. Vercel account (sign up at [vercel.com](https://vercel.com))
3. MongoDB Atlas database
4. Cloudinary account for image storage

### Environment Variables

You'll need to set these environment variables in Vercel:

#### For Web (Frontend):
- `NEXT_PUBLIC_API_URL` - Your deployed API URL

#### For API (Backend):
- `MONGODB_URI` - Your MongoDB connection string
- `JWT_SECRET` - Secret key for JWT authentication
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `PORT` - Port number (optional, defaults to 5000)

### Deployment Steps

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository: `mohaimin2103001/zargoninventorymanagement`
   - Vercel will auto-detect the Next.js framework

3. **Configure the Project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. **Add Environment Variables:**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add all required variables listed above

5. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Deploying the API Separately

Since this is a monorepo, you may want to deploy the API separately:

1. Create another Vercel project for the API
2. Set Root Directory to `api`
3. Add API environment variables
4. Deploy

Alternatively, use the included `vercel.json` at the root which handles both.

## Local Development

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mohaimin2103001/zargoninventorymanagement.git
   cd zargoninventorymanagement
   ```

2. **Install dependencies:**
   ```bash
   # Install API dependencies
   cd api
   npm install

   # Install Web dependencies
   cd ../web
   npm install
   ```

3. **Configure environment variables:**
   
   Create `api/.env`:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   PORT=5000
   ```

   Create `web/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. **Run the development servers:**
   ```bash
   # Terminal 1 - API Server
   cd api
   npm run dev

   # Terminal 2 - Web Server
   cd web
   npm run dev
   ```

5. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:5000

## Features

- 📦 Stock/Inventory Management
- 📝 Order Processing
- 📊 Analytics & Reports
- 👥 Customer Rankings
- 📢 Notices Management
- 💾 Backup & Restore
- 👤 User Management (Admin/Staff roles)
- 🖼️ Image Upload with Cloudinary
- 📱 Responsive Design

## License

© 2025 Zargon Inventory Management System. All rights reserved.

---

Developed with ❤️ by **Md Wariul Mohaimin**
