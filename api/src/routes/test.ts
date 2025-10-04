import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
const router = express.Router();

// Function to ensure Cloudinary is configured
const ensureCloudinaryConfig = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// Test Cloudinary configuration
router.get('/cloudinary-config', (req: any, res: any) => {
  try {
    // Ensure Cloudinary is configured
    ensureCloudinaryConfig();
    
    const config = {
      cloud_name: cloudinary.config().cloud_name,
      api_key: cloudinary.config().api_key,
      configured: !!(cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret)
    };
    
    res.json({
      message: 'Cloudinary configuration status',
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      message: 'Error checking Cloudinary configuration',
      error: error.message
    });
  }
});

// Test image upload without file
router.post('/upload-test', (req: any, res: any) => {
  // Ensure Cloudinary is configured
  ensureCloudinaryConfig();
  
  res.json({
    message: 'Test endpoint working',
    cloudinary_configured: !!(cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret),
    timestamp: new Date().toISOString()
  });
});

export default router;
