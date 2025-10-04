import { logger } from '../utils/logger';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { auth, adminOnly } from '../middleware/auth';
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  uploadImages,
  removeImage
} from '../controllers/inventoryController';
import { upload } from '../config/cloudinary';

const router = express.Router();

// Multer error handling middleware
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    logger.error('Multer error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size too large. Maximum allowed size is 10MB per file.'
        }
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Too many files. Maximum 5 files allowed.'
        }
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: {
          code: 'INVALID_FIELD',
          message: 'Unexpected file field. Use "images" field for file uploads.'
        }
      });
    }
    
    return res.status(400).json({
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message || 'File upload error'
      }
    });
  }
  
  next();
};

router.get('/', auth, getInventory);
router.post('/', auth, adminOnly, createInventoryItem);
router.patch('/:id', auth, adminOnly, updateInventoryItem);
router.delete('/:id', auth, adminOnly, deleteInventoryItem);
router.post('/:id/images', auth, adminOnly, upload.array('images', 5), handleMulterError, uploadImages);
router.delete('/:id/images', auth, adminOnly, removeImage);

export default router;

