// CRITICAL: Load environment variables FIRST, before any imports that might use them
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

// Import services and utilities (env vars are now loaded)
import BackupMirrorService from './backup/mirror';
import { initializeDatabaseManager, getDatabaseManager } from './services/database-manager';
import { logger } from './utils/logger';

const app = express();
const PORT = 5000;

// Check if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS;

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}
if (!process.env.MONGODB_MIRROR_URI) {
  throw new Error('MONGODB_MIRROR_URI environment variable is required');
}
if (!process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL environment variable is required');
}

// Initialize Database Manager with failover capability
const databaseConfig = {
  primaryUri: process.env.MONGODB_URI,
  mirrorUri: process.env.MONGODB_MIRROR_URI,
  healthCheckInterval: 30000, // 30 seconds
  enableHealthMonitoring: !isServerless // Disable health monitoring in serverless
}

const databaseManager = initializeDatabaseManager(databaseConfig);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (only in development)
app.use((req, res, next) => {
  logger.http(req.method, req.path);
  next();
});

// CRITICAL: In serverless mode, ensure DB initialization happens on first request
// This middleware MUST be before any route handlers to prevent 404s during cold start
if (isServerless) {
  let isInitialized = false;
  let initializationPromise: Promise<void> | null = null;
  
  app.use(async (req, res, next) => {
    if (!isInitialized) {
      // Prevent race condition: if another request is initializing, wait for it
      if (initializationPromise) {
        try {
          await initializationPromise;
        } catch (error) {
          logger.error('Initialization failed in concurrent request:', error);
          return res.status(500).json({ error: 'Server initialization failed' });
        }
      } else {
        // This request is the first one, start initialization
        initializationPromise = startServer()
          .then(() => {
            isInitialized = true;
            logger.debug('✅ Serverless function initialized');
          })
          .catch((error) => {
            logger.error('Failed to initialize serverless function:', error);
            initializationPromise = null; // Reset to allow retry
            throw error;
          });
        
        try {
          await initializationPromise;
        } catch (error) {
          return res.status(500).json({ error: 'Server initialization failed' });
        }
      }
    }
    next();
  });
}

// Note: Routes will be registered AFTER database initialization in startServer()
// This ensures models use the correct database connection

// Backup API routes (file-based backups removed - use MongoDB Atlas backups instead)
app.get('/api/backup/status', (req, res) => {
  res.status(500).json({ 
    error: 'File-based backups are disabled. Use MongoDB Atlas automated backups for production.'
  });
});

app.post('/api/backup/create', (req, res) => {
  res.status(500).json({ 
    error: 'Manual file backups are disabled. Use MongoDB Atlas on-demand backups instead.'
  });
});

app.post('/api/backup/restore', (req, res) => {
  res.status(500).json({ 
    error: 'File-based backup restoration is disabled. Use MongoDB Atlas restore feature.'
  });
});

app.get('/api/backup/health', (req, res) => {
  res.status(500).json({ 
    error: 'Backup health monitoring moved to MongoDB Atlas.'
  });
});

// Database Manager API routes
app.get('/api/database/status', async (req, res) => {
  try {
    const status = getDatabaseManager().getDatabaseStatus();
    const health = await getDatabaseManager().performHealthCheck();
    res.json({
      status,
      health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get database status:', error);
    res.status(500).json({ error: 'Failed to get database status' });
  }
});

app.post('/api/database/switch', async (req, res) => {
  try {
    const { target } = req.body;
    
    if (!target || !['primary', 'mirror'].includes(target)) {
      return res.status(400).json({ error: 'Invalid target. Must be "primary" or "mirror"' });
    }
    
    const result = await getDatabaseManager().switchDatabase(target);
    res.json(result);
  } catch (error) {
    logger.error('Failed to switch database:', error);
    res.status(500).json({ error: 'Failed to switch database' });
  }
});

app.post('/api/database/auto-failover', async (req, res) => {
  try {
    getDatabaseManager().clearManualOverride();
    res.json({ 
      success: true, 
      message: 'Auto-failover enabled. System will automatically switch databases based on health.' 
    });
  } catch (error) {
    logger.error('Failed to enable auto-failover:', error);
    res.status(500).json({ error: 'Failed to enable auto-failover' });
  }
});

app.get('/api/database/health', async (req, res) => {
  try {
    const health = await getDatabaseManager().performHealthCheck();
    res.json(health);
  } catch (error) {
    logger.error('Failed to perform health check:', error);
    res.status(500).json({ error: 'Failed to perform health check' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection and server startup
async function startServer() {
  try {
    // Initialize Database Manager with failover capability (handles all MongoDB connections)
    await databaseManager.initialize();
    
    // Set up event listeners for database events
    databaseManager.on('failover', (event) => {
      logger.warn(`?? DATABASE FAILOVER: ${event.from} ? ${event.to} at ${event.timestamp}`);
    });
    
    databaseManager.on('switch-to-primary', (event) => {
      logger.info(`? DATABASE RECOVERY: Switched back to primary at ${event.timestamp}`);
    });
    
    databaseManager.on('manual-switch', (event) => {
      logger.info(`?? MANUAL SWITCH: Switched to ${event.to} at ${event.timestamp}`);
    });

    // IMPORTANT: Import routes AFTER database is initialized
    // This ensures models use the correct database connection
    logger.debug('📦 Loading routes and models...');
    const authRoutes = require('./routes/auth').default;
    const inventoryRoutes = require('./routes/inventory').default;
    const orderRoutes = require('./routes/orders').default;
    const reportRoutes = require('./routes/reports').default;
    const exportRoutes = require('./routes/export').default;
    const deliveryRoutes = require('./routes/delivery').default;
    const courierRoutes = require('./routes/courierRoutes').default;
    const userRoutes = require('./routes/users').default;
    const uploadRoutes = require('./routes/upload').default;
    const inventoryImagesRoutes = require('./routes/inventory-images').default;
    const noticesRoutes = require('./routes/notices').default;
    const analyticsRoutes = require('./routes/analytics').default;
    const customerRankingsRoutes = require('./routes/customerRankings').default;
    const testRoutes = require('./routes/test').default;

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/inventory', inventoryRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/export', exportRoutes);
    app.use('/api/notices', noticesRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/delivery', deliveryRoutes);
    app.use('/api/courier', courierRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/upload', uploadRoutes);
    app.use('/api', inventoryImagesRoutes);
    app.use('/api', customerRankingsRoutes);
    app.use('/api/test', testRoutes);
    logger.debug('✅ Routes registered');

    // Error handling middleware (must be after routes)
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });

    // 404 handler (must be last, after all routes)
    app.use('*', (req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      });
    });
    logger.debug('✅ Error handlers registered');

    // Initialize backup mirroring service (Change Streams disabled in serverless mode)
    const backupMirrorService = BackupMirrorService.getInstance();
    const mirrorConnection = databaseManager.getMirrorConnection();
    await backupMirrorService.startMirroring(!isServerless, mirrorConnection); // Reuse Database Manager's mirror connection
    
    if (isServerless) {
      logger.debug('?? Running in serverless mode - use on-demand mirroring via mirrorInventoryItem() and mirrorOrder()');
    } else {
      logger.info('? Running in traditional server mode - Change Streams enabled for real-time mirroring');
    }

    // Start server only in non-serverless mode (local development)
    if (!isServerless) {
      app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
      });
    } else {
      logger.info('? Serverless mode - Express app ready for Vercel');
    }
  } catch (error) {
    logger.error('Failed to start server:', error);
    if (!isServerless) {
      process.exit(1);
    }
  }
}

// Graceful shutdown (only for non-serverless mode)
if (!isServerless) {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    const backupService = BackupMirrorService.getInstance();
    await backupService.stopMirroring();
    
    await mongoose.connection.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    
    const backupService = BackupMirrorService.getInstance();
    await backupService.stopMirroring();
    
    await mongoose.connection.close();
    process.exit(0);
  });
}

// Initialize server - only in non-serverless mode (local development)
// In serverless mode, initialization happens in the middleware above (before routes)
if (!isServerless) {
  startServer();
}

// Export for Vercel serverless
export default app;
