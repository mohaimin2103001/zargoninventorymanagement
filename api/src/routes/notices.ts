import { Router } from 'express';
import { createNotice, getNotices, updateNotice, deleteNotice } from '../controllers/noticeController';
import { auth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(auth);

// Get all notices (accessible to all authenticated users)
router.get('/', getNotices);

// Create notice (admin only)
router.post('/', createNotice);

// Update notice (admin or creator only)
router.put('/:id', updateNotice);

// Delete notice (admin or creator only)
router.delete('/:id', deleteNotice);

export default router;
