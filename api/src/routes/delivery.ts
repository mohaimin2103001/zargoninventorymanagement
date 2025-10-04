import express from 'express';
import { auth } from '../middleware/auth';
import {
  toggleDeliverySelection,
  exportDeliveryVoucher,
  clearDeliverySelections
} from '../controllers/deliveryController';

const router = express.Router();

// Toggle delivery selection for an order
router.patch('/:id/toggle', auth, toggleDeliverySelection);

// Export selected orders as delivery voucher
router.get('/export', auth, exportDeliveryVoucher);

// Clear all delivery selections
router.post('/clear', auth, clearDeliverySelections);

export default router;
