import { Router } from 'express';
import { auth } from '../middleware/auth';
import { 
  exportOrdersToExcel, 
  exportInventoryToExcel,
  exportOrdersToPDF,
  exportInventoryToPDF
} from '../controllers/exportController';

const router = Router();

// Excel exports
router.get('/orders/excel', auth, exportOrdersToExcel);
router.get('/inventory/excel', auth, exportInventoryToExcel);

// PDF exports
router.get('/orders/pdf', auth, exportOrdersToPDF);
router.get('/inventory/pdf', auth, exportInventoryToPDF);

export default router;
