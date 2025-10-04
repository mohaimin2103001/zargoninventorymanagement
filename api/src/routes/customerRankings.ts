import { Router } from 'express';
import { auth } from '../middleware/auth';
import { 
  getCustomerRankings, 
  getCustomerRankingTrends 
} from '../controllers/customerRankingsController';

const router = Router();

// All customer ranking routes require authentication
router.use(auth);

// Get customer rankings
router.get('/customer-rankings', getCustomerRankings);

// Get customer ranking trends
router.get('/customer-rankings/:phone/trends', getCustomerRankingTrends);

export default router;
