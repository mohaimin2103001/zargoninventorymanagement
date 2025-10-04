import mongoose from 'mongoose';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  primaryUri: string;
  mirrorUri: string;
  healthCheckInterval: number;
  enableHealthMonitoring?: boolean; // Optional: disable for serverless environments
}

export class DatabaseManager extends EventEmitter {
  private config: DatabaseConfig;
  private currentConnection: 'primary' | 'mirror' = 'primary';
  private primaryConnection: mongoose.Connection | null = null;
  private mirrorConnection: mongoose.Connection | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isFailoverMode: boolean = false;
  private manualOverride: 'primary' | 'mirror' | null = null;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      logger.debug('🔄 Initializing Database Manager...');
      
      // Try to connect to primary database first
      await this.connectToPrimary();
      
      // Also establish mirror connection
      await this.connectToMirror();
      
      // Start health monitoring (only if enabled - disabled for serverless)
      if (this.config.enableHealthMonitoring !== false) {
        this.startHealthMonitoring();
        logger.debug('✅ Health monitoring enabled');
      } else {
        logger.debug('ℹ️ Health monitoring disabled (serverless mode)');
      }
      
      logger.info('✅ Database Manager initialized successfully');
      logger.debug(`📊 Active Connection: ${this.currentConnection.toUpperCase()}`);
      
    } catch (error) {
      logger.error('❌ Failed to initialize Database Manager:', error);
      throw error;
    }
  }

  private async connectToPrimary(): Promise<void> {
    try {
      this.primaryConnection = mongoose.createConnection(this.config.primaryUri);
      
      this.primaryConnection.on('connected', () => {
        logger.info('✅ Connected to PRIMARY database');
        if (this.currentConnection !== 'primary' && !this.manualOverride) {
          this.switchToPrimary();
        }
      });

      this.primaryConnection.on('error', (error) => {
        logger.error('❌ PRIMARY database error:', error);
        this.handlePrimaryError();
      });

      this.primaryConnection.on('disconnected', () => {
        logger.warn('⚠️ PRIMARY database disconnected');
        this.handlePrimaryDisconnection();
      });

      await this.primaryConnection.asPromise();
      
      // IMPORTANT: Set this as the default mongoose connection immediately
      // This ensures all models use this connection
      (mongoose as any).connection = this.primaryConnection;
      logger.debug('✅ Set primary connection as default mongoose connection');
      
    } catch (error) {
      logger.error('❌ Failed to connect to primary database:', error);
      throw error;
    }
  }

  private async connectToMirror(): Promise<void> {
    try {
      // Check if mirror URI is the same as primary URI
      if (this.config.mirrorUri === this.config.primaryUri) {
        logger.debug('ℹ️ Mirror URI same as primary - using primary connection as mirror');
        this.mirrorConnection = this.primaryConnection;
        return;
      }
      
      this.mirrorConnection = mongoose.createConnection(this.config.mirrorUri);
      
      this.mirrorConnection.on('connected', () => {
        logger.info('✅ Connected to MIRROR database');
      });

      this.mirrorConnection.on('error', (error) => {
        logger.error('❌ MIRROR database error:', error);
      });

      this.mirrorConnection.on('disconnected', () => {
        logger.warn('⚠️ MIRROR database disconnected');
      });

      await this.mirrorConnection.asPromise();
      
    } catch (error) {
      logger.error('❌ Failed to connect to mirror database:', error);
      // Use primary connection as fallback
      logger.debug('ℹ️ Using primary connection as mirror fallback');
      this.mirrorConnection = this.primaryConnection;
    }
  }

  private handlePrimaryError(): void {
    if (this.currentConnection === 'primary' && !this.manualOverride) {
      logger.warn('🔄 Primary database error detected, attempting failover...');
      this.performFailover();
    }
  }

  private handlePrimaryDisconnection(): void {
    if (this.currentConnection === 'primary' && !this.manualOverride) {
      logger.warn('🔄 Primary database disconnected, attempting failover...');
      this.performFailover();
    }
  }

  private async performFailover(): Promise<void> {
    try {
      if (!this.mirrorConnection || this.mirrorConnection.readyState !== 1) {
        logger.error('❌ Mirror database not available for failover');
        return;
      }

      logger.debug('🚨 PERFORMING AUTOMATIC FAILOVER TO MIRROR DATABASE');
      
      this.currentConnection = 'mirror';
      this.isFailoverMode = true;
      
      // Update mongoose default connection (don't close - just reassign)
      (mongoose as any).connection = this.mirrorConnection;
      
      this.emit('failover', {
        from: 'primary',
        to: 'mirror',
        timestamp: new Date().toISOString(),
        automatic: true
      });

      logger.debug('✅ Failover completed successfully');
      logger.debug('📊 Now using MIRROR database');
      
    } catch (error) {
      logger.error('❌ Failover failed:', error);
      this.emit('failover-failed', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private switchToPrimary(): void {
    if (this.manualOverride === 'mirror') {
      logger.debug('ℹ️ Manual override active - staying on mirror database');
      return;
    }

    try {
      logger.debug('🔄 Switching back to PRIMARY database');
      
      this.currentConnection = 'primary';
      this.isFailoverMode = false;
      
      // Update mongoose default connection (don't close - just reassign)
      (mongoose as any).connection = this.primaryConnection;
      
      this.emit('switch-to-primary', {
        timestamp: new Date().toISOString()
      });

      logger.debug('✅ Switched back to PRIMARY database');
      
    } catch (error) {
      logger.error('❌ Failed to switch to primary:', error);
    }
  }

  // Manual database switching
  async switchDatabase(target: 'primary' | 'mirror'): Promise<{ success: boolean; message: string }> {
    try {
      logger.debug(`🔄 Manual switch to ${target.toUpperCase()} database requested`);
      
      const targetConnection = target === 'primary' ? this.primaryConnection : this.mirrorConnection;
      
      if (!targetConnection) {
        return {
          success: false,
          message: `${target} database connection not initialized`
        };
      }

      // If mirror and primary are the same connection, treat as successful switch
      if (target === 'mirror' && this.mirrorConnection === this.primaryConnection) {
        logger.debug(`🔄 MANUAL SWITCH: Switching to ${target} (using same connection as primary)`);
        this.manualOverride = target;
        this.currentConnection = target;
        
        // Still update mongoose connection to ensure consistency
        (mongoose as any).connection = this.mirrorConnection;
        
        this.emit('manual-switch', {
          to: target,
          timestamp: new Date().toISOString()
        });

        return {
          success: true,
          message: `Successfully switched to ${target} database (using primary connection)`
        };
      }

      if (targetConnection.readyState !== 1) {
        return {
          success: false,
          message: `${target} database is not connected (state: ${targetConnection.readyState})`
        };
      }

      logger.debug(`🔄 MANUAL SWITCH: Switching to ${target}`);
      this.manualOverride = target;
      this.currentConnection = target;
      
      // Update mongoose default connection to the target
      (mongoose as any).connection = targetConnection;
      
      this.emit('manual-switch', {
        to: target,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: `Successfully switched to ${target} database`
      };
      
    } catch (error) {
      logger.error(`❌ Failed to switch to ${target}:`, error);
      return {
        success: false,
        message: `Failed to switch to ${target}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Clear manual override (allow automatic failover)
  clearManualOverride(): void {
    logger.debug('🔄 Clearing manual override - enabling automatic failover');
    this.manualOverride = null;
    
    // Check if primary is available and switch back
    if (this.primaryConnection?.readyState === 1 && this.currentConnection === 'mirror') {
      this.switchToPrimary();
    }
  }

  // Get current database status
  getDatabaseStatus(): any {
    return {
      currentConnection: this.currentConnection,
      isFailoverMode: this.isFailoverMode,
      manualOverride: this.manualOverride,
      primaryStatus: this.primaryConnection ? {
        readyState: this.primaryConnection.readyState,
        name: this.primaryConnection.name,
        host: this.primaryConnection.host,
        port: this.primaryConnection.port
      } : null,
      mirrorStatus: this.mirrorConnection ? {
        readyState: this.mirrorConnection.readyState,
        name: this.mirrorConnection.name,
        host: this.mirrorConnection.host,
        port: this.mirrorConnection.port
      } : null,
      connectionStates: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }
    };
  }

  // Health check for both databases
  async performHealthCheck(): Promise<any> {
    const results = {
      timestamp: new Date().toISOString(),
      primary: { available: false, ping: null as number | null, error: null as string | null },
      mirror: { available: false, ping: null as number | null, error: null as string | null }
    };

    // Check primary database
    if (this.primaryConnection && this.primaryConnection.db) {
      try {
        const start = Date.now();
        // Use MongoDB ping command for health check
        await this.primaryConnection.db.command({ ping: 1 });
        results.primary = {
          available: true,
          ping: Date.now() - start,
          error: null
        };
      } catch (error) {
        results.primary.error = error instanceof Error ? error.message : String(error);
      }
    }

    // Check mirror database
    if (this.mirrorConnection && this.mirrorConnection.db && this.mirrorConnection !== this.primaryConnection) {
      try {
        const start = Date.now();
        // Use MongoDB ping command for health check
        await this.mirrorConnection.db.command({ ping: 1 });
        results.mirror = {
          available: true,
          ping: Date.now() - start,
          error: null
        };
      } catch (error) {
        results.mirror.error = error instanceof Error ? error.message : String(error);
      }
    } else if (this.mirrorConnection === this.primaryConnection) {
      // Mirror using same connection as primary
      results.mirror = {
        available: results.primary.available,
        ping: results.primary.ping,
        error: results.primary.error
      };
    }

    return results;
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      const health = await this.performHealthCheck();
      
      // Emit health status
      this.emit('health-check', health);
      
      // Auto-recovery logic
      if (!health.primary.available && this.currentConnection === 'primary' && !this.manualOverride) {
        logger.debug('🔄 Primary database unhealthy, checking for failover...');
        if (health.mirror.available) {
          this.performFailover();
        }
      } else if (health.primary.available && this.currentConnection === 'mirror' && !this.manualOverride && !this.isFailoverMode) {
        logger.debug('🔄 Primary database recovered, switching back...');
        this.switchToPrimary();
      }
    }, this.config.healthCheckInterval);
  }

  // Get the active connection for use in models
  getActiveConnection(): mongoose.Connection {
    return this.currentConnection === 'primary' 
      ? this.primaryConnection! 
      : this.mirrorConnection!;
  }

  // Get the mirror connection for backup/Change Streams
  getMirrorConnection(): mongoose.Connection | null {
    return this.mirrorConnection;
  }

  // Graceful shutdown
  async close(): Promise<void> {
    try {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }

      if (this.primaryConnection) {
        await this.primaryConnection.close();
      }

      if (this.mirrorConnection) {
        await this.mirrorConnection.close();
      }

      logger.debug('✅ Database Manager closed successfully');
    } catch (error) {
      logger.error('❌ Error closing Database Manager:', error);
    }
  }
}

// Singleton instance
// NOTE: Singleton is acceptable here for serverless because:
// - Only used for read-only status/health check APIs
// - No shared mutable state across requests
// - Each serverless instance has its own singleton
let databaseManager: DatabaseManager | null = null;

export function initializeDatabaseManager(config: DatabaseConfig): DatabaseManager {
  if (!databaseManager) {
    databaseManager = new DatabaseManager(config);
  }
  return databaseManager;
}

export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager) {
    throw new Error('Database Manager not initialized. Call initializeDatabaseManager first.');
  }
  return databaseManager;
}
