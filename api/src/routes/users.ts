import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getCurrentUser,
  updateProfile,
  createStaff,
  getAllStaff,
  getAllUsers,
  toggleStaffStatus,
  setStaffPassword,
  updateStaffPassword,
  getStaffActivity,
  deleteStaff
} from '../controllers/userController';

const router = Router();

// User profile routes
router.get('/profile', auth, getCurrentUser);
router.put('/profile', auth, updateProfile);

// Admin routes for viewing all users
router.get('/all', auth, getAllUsers);

// Staff management routes (admin only)
router.post('/staff', auth, createStaff);
router.get('/staff', auth, getAllStaff);
router.delete('/staff/:staffId', auth, deleteStaff);
router.patch('/staff/:staffId/toggle', auth, toggleStaffStatus);
router.put('/staff/:staffId/toggle-status', auth, toggleStaffStatus);
router.put('/staff/:staffId/password', auth, updateStaffPassword);
router.get('/staff/activity', auth, getStaffActivity);
router.get('/staff/:staffId/activity', auth, getStaffActivity);
router.get('/activity', auth, getStaffActivity);

// Admin user management routes
router.get('/all', auth, getAllUsers);

// Staff password setup (no auth required - for first-time password setting)
router.post('/staff/set-password', setStaffPassword);

export default router;
