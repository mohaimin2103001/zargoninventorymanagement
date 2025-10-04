import { logger } from '../utils/logger';
import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

// Function to ensure Cloudinary is configured
const ensureCloudinaryConfig = () => {
  logger.debug('Configuring Cloudinary...');
  logger.debug('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
  logger.debug('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
  logger.debug('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'NOT SET');
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Missing Cloudinary configuration. Please check your environment variables.');
  }
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  logger.debug('Cloudinary configured successfully');
};

// Upload single image
router.post('/image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Ensure Cloudinary is configured
    ensureCloudinaryConfig();

    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided'
      });
    }

    logger.debug('Uploading image to Cloudinary...');
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'zargon-inventory',
          resource_type: 'image',
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        (error: any, result: any) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            logger.debug('Cloudinary upload success:', result.secure_url);
            resolve(result);
          }
        }
      ).end(req.file!.buffer);
    });

    const uploadResult = result as any;

    res.json({
      message: 'Image uploaded successfully',
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      width: uploadResult.width,
      height: uploadResult.height,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    });

  } catch (error) {
    logger.error('Image upload error:', error);
    res.status(500).json({
      message: 'Error uploading image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload multiple images
router.post('/images', upload.array('images', 5), async (req: Request, res: Response) => {
  try {
    // Ensure Cloudinary is configured
    ensureCloudinaryConfig();
    
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        message: 'No image files provided'
      });
    }

    logger.debug(`Uploading ${files.length} images to Cloudinary...`);

    const uploadPromises = files.map(file => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'zargon-inventory',
            resource_type: 'image',
            transformation: [
              { width: 1000, height: 1000, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          },
          (error: any, result: any) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    const uploadedImages = results.map((result: any) => ({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    }));

    logger.debug(`Successfully uploaded ${uploadedImages.length} images`);

    res.json({
      message: 'Images uploaded successfully',
      images: uploadedImages,
      count: uploadedImages.length
    });

  } catch (error) {
    logger.error('Multiple images upload error:', error);
    res.status(500).json({
      message: 'Error uploading images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

