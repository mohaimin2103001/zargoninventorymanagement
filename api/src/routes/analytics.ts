import express from 'express';
import { auth } from '../middleware/auth';
import { 
  getABCAnalysis, 
  getDemandForecast, 
  getCustomerAnalytics, 
  getFinancialAnalytics 
} from '../controllers/analyticsController';

const router = express.Router();

// All analytics routes require authentication
router.use(auth);

// ABC Analysis for inventory optimization
router.get('/abc-analysis', getABCAnalysis);

// Demand forecasting
router.get('/demand-forecast', getDemandForecast);

// Customer behavior analytics
router.get('/customer-analytics', getCustomerAnalytics);

// Advanced financial analytics
router.get('/financial-analytics', getFinancialAnalytics);

export default router;
