import express from 'express';
import { auth } from '../middleware/auth';
import {
  getOrders,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getManualStatusOverrides,
  clearManualStatusOverride,
  clearAllManualStatusOverrides
} from '../controllers/orderController';

const router = express.Router();

router.get('/', auth, getOrders);
router.post('/', auth, createOrder);
router.patch('/:id', auth, updateOrder);
router.patch('/:id/status', auth, updateOrderStatus);
router.delete('/:id', auth, deleteOrder);

// Manual status override routes
router.get('/manual-overrides', auth, getManualStatusOverrides);
router.delete('/:id/manual-override', auth, clearManualStatusOverride);
router.delete('/manual-overrides/clear-all', auth, clearAllManualStatusOverrides);

export default router;
