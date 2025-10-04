import { logger } from '../utils/logger';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';

// Configure Cloudinary - deferred until environment variables are loaded
let isConfigured = false;

const configureCloudinary = () => {
  if (!isConfigured) {
    logger.debug('Configuring Cloudinary...');
    logger.debug('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
    logger.debug('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
    logger.debug('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***REDACTED***' : 'MISSING');

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    
    isConfigured = true;
  }
};

// Helper function to upload to Cloudinary - using signed upload
export const uploadToCloudinary = async (buffer: Buffer, filename: string): Promise<string> => {
  configureCloudinary(); // Ensure config is set before upload
  
  try {
    logger.debug('🌩️ Starting Cloudinary upload for:', filename);
    logger.debug('Buffer size:', buffer.length, 'bytes');
    
    // Check if Cloudinary is properly configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary environment variables not properly configured');
    }
    
    // Use signed upload with proper configuration
    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${buffer.toString('base64')}`,
      {
        public_id: filename,
        folder: 'zargon-inventory',
        overwrite: true,
        transformation: [
          { width: 1000, height: 1000, crop: 'limit', quality: 'auto:good' }
        ]
      }
    );
    
    logger.debug('✅ Cloudinary upload success:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    logger.error('❌ Cloudinary upload error details:', {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      filename: filename,
      bufferSize: buffer.length,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
    });
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Configure Multer for memory storage
const storage = multer.memoryStorage();

export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (increased from 5MB)
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export { cloudinary };

