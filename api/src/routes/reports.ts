import express from 'express';
import { auth } from '../middleware/auth';
import { getReports, getRealTimeAlerts } from '../controllers/reportsController';

const router = express.Router();

router.get('/', auth, getReports);
router.get('/alerts', auth, getRealTimeAlerts);

export default router;
