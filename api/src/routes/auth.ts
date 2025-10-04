import express from 'express';
import { register, login, setStaffPassword } from '../controllers/authController';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (increased for development)
  message: {
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many authentication attempts, please try again later'
    }
  }
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/set-staff-password', authLimiter, setStaffPassword);

// Test endpoint for connectivity
router.get('/test', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Auth API is working',
    timestamp: new Date().toISOString() 
  });
});

export default router;
