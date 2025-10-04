import mongoose from 'mongoose';
import { ChangeStream } from 'mongodb';
// IMPORTANT: Don't import models at module level - they must be imported after DB connection is ready
// Models are imported inside methods where needed
import { logger } from '../utils/logger';

class BackupMirrorService {
  private static instance: BackupMirrorService;
  private inventoryStream: ChangeStream | null = null;
  private ordersStream: ChangeStream | null = null;
  private mirrorConnection: mongoose.Connection | null = null;
  private enableChangeStreams: boolean = true; // Can be disabled for serverless

  private constructor() {}

  public static getInstance(): BackupMirrorService {
    if (!BackupMirrorService.instance) {
      BackupMirrorService.instance = new BackupMirrorService();
    }
    return BackupMirrorService.instance;
  }

  public async startMirroring(enableChangeStreams: boolean = true, existingMirrorConnection?: mongoose.Connection | null) {
    try {
      logger.debug('Starting backup mirroring service...');
      this.enableChangeStreams = enableChangeStreams;
      
      // Reuse existing mirror connection from Database Manager if provided
      if (existingMirrorConnection) {
        logger.debug('♻️ Reusing existing mirror database connection');
        this.mirrorConnection = existingMirrorConnection;
      } else {
        // Fallback: Initialize mirror database connection
        const mirrorUri = process.env.MONGODB_MIRROR_URI;
        if (!mirrorUri || mirrorUri === process.env.MONGODB_URI) {
          logger.warn('⚠️ Mirror URI not configured or same as primary - mirroring disabled');
          this.mirrorConnection = null;
          return;
        }

        logger.debug('🔄 Connecting to mirror database...');
        this.mirrorConnection = mongoose.createConnection(mirrorUri);
        await this.mirrorConnection.asPromise();
        logger.info('✅ Connected to mirror database');
      }
      
      // Only start Change Streams if enabled (disabled for serverless)
      if (this.enableChangeStreams) {
        // Import models dynamically after DB connection is ready
        const { InventoryItem } = require('../models/InventoryItem');
        const { Order } = require('../models/Order');
        
        // Mirror inventory changes
        this.inventoryStream = InventoryItem.watch([], { fullDocument: 'updateLookup' });
        if (this.inventoryStream) {
          this.inventoryStream.on('change', async (change) => {
            await this.mirrorInventoryChange(change);
          });
        }

        // Mirror order changes
        this.ordersStream = Order.watch([], { fullDocument: 'updateLookup' });
        if (this.ordersStream) {
          this.ordersStream.on('change', async (change) => {
            await this.mirrorOrderChange(change);
          });
        }

        logger.info('✅ Change Streams enabled for real-time mirroring');
      } else {
        logger.debug('ℹ️ Change Streams disabled (serverless mode - use on-demand mirroring)');
      }

      logger.debug('Backup mirroring service started successfully');
    } catch (error) {
      logger.error('Failed to start backup mirroring service:', error);
      // Don't throw - allow app to continue without mirroring
      logger.warn('⚠️ Continuing without backup mirroring');
    }
  }

  private async mirrorInventoryChange(change: any): Promise<void> {
    try {
      if (!this.mirrorConnection) throw new Error('Mirror database connection not available');
      
      const db = this.mirrorConnection.db;
      if (!db) throw new Error('Mirror database not available');
      const backupCollection = db!.collection('inventoryitems');
      
      const mirrorDocument = {
        ...change.fullDocument,
        mirroredAt: new Date(),
        op: change.operationType,
        originalId: change.documentKey._id
      };

      switch (change.operationType) {
        case 'insert':
        case 'update':
        case 'replace':
          await backupCollection.replaceOne(
            { originalId: change.documentKey._id },
            mirrorDocument,
            { upsert: true }
          );
          logger.debug(`🔄 Mirrored inventory ${change.operationType}: ${change.documentKey._id}`);
          break;
        case 'delete':
          await backupCollection.updateOne(
            { originalId: change.documentKey._id },
            { 
              $set: { 
                mirroredAt: new Date(),
                op: 'delete',
                deletedAt: new Date()
              }
            }
          );
          logger.debug(`🔄 Mirrored inventory deletion: ${change.documentKey._id}`);
          break;
      }
    } catch (error) {
      logger.error('Failed to mirror inventory change:', error);
    }
  }

  private async mirrorOrderChange(change: any): Promise<void> {
    try {
      if (!this.mirrorConnection) throw new Error('Mirror database connection not available');
      
      const db = this.mirrorConnection.db;
      if (!db) throw new Error('Mirror database not available');
      const backupCollection = db!.collection('orders');
      
      const mirrorDocument = {
        ...change.fullDocument,
        mirroredAt: new Date(),
        op: change.operationType,
        originalId: change.documentKey._id
      };

      switch (change.operationType) {
        case 'insert':
        case 'update':
        case 'replace':
          await backupCollection.replaceOne(
            { originalId: change.documentKey._id },
            mirrorDocument,
            { upsert: true }
          );
          break;
        case 'delete':
          await backupCollection.updateOne(
            { originalId: change.documentKey._id },
            { 
              $set: { 
                mirroredAt: new Date(),
                op: 'delete',
                deletedAt: new Date()
              }
            }
          );
          break;
      }
    } catch (error) {
      logger.error('Failed to mirror order change:', error);
    }
  }

  public async stopMirroring() {
    try {
      if (this.inventoryStream) {
        await this.inventoryStream.close();
        this.inventoryStream = null;
      }
      if (this.ordersStream) {
        await this.ordersStream.close();
        this.ordersStream = null;
      }
      if (this.mirrorConnection && this.mirrorConnection !== mongoose.connection) {
        await this.mirrorConnection.close();
        this.mirrorConnection = null;
      }
      logger.debug('Backup mirroring service stopped');
    } catch (error) {
      logger.error('Error stopping backup mirroring service:', error);
    }
  }

  // On-demand mirroring for serverless environments
  public async mirrorInventoryItem(operation: 'insert' | 'update' | 'delete', document: any): Promise<void> {
    try {
      if (!this.mirrorConnection || !this.mirrorConnection.db) {
        return; // Skip if mirror not configured
      }

      const backupCollection = this.mirrorConnection.db.collection('inventoryitems');
      
      const mirrorDocument = {
        ...document,
        mirroredAt: new Date(),
        op: operation,
        originalId: document._id
      };

      switch (operation) {
        case 'insert':
        case 'update':
          await backupCollection.replaceOne(
            { originalId: document._id },
            mirrorDocument,
            { upsert: true }
          );
          break;
        case 'delete':
          await backupCollection.updateOne(
            { originalId: document._id },
            { 
              $set: { 
                mirroredAt: new Date(),
                op: 'delete',
                deletedAt: new Date()
              }
            }
          );
          break;
      }
    } catch (error) {
      logger.error('Failed to mirror inventory item:', error);
      // Don't throw - allow operation to continue even if mirroring fails
    }
  }

  public async mirrorOrder(operation: 'insert' | 'update' | 'delete', document: any): Promise<void> {
    try {
      if (!this.mirrorConnection || !this.mirrorConnection.db) {
        return; // Skip if mirror not configured
      }

      const backupCollection = this.mirrorConnection.db.collection('orders');
      
      const mirrorDocument = {
        ...document,
        mirroredAt: new Date(),
        op: operation,
        originalId: document._id
      };

      switch (operation) {
        case 'insert':
        case 'update':
          await backupCollection.replaceOne(
            { originalId: document._id },
            mirrorDocument,
            { upsert: true }
          );
          break;
        case 'delete':
          await backupCollection.updateOne(
            { originalId: document._id },
            { 
              $set: { 
                mirroredAt: new Date(),
                op: 'delete',
                deletedAt: new Date()
              }
            }
          );
          break;
      }
    } catch (error) {
      logger.error('Failed to mirror order:', error);
      // Don't throw - allow operation to continue even if mirroring fails
    }
  }

  // Helper to get mirror connection status
  public isMirrorConfigured(): boolean {
    return this.mirrorConnection !== null && this.mirrorConnection.readyState === 1;
  }
}

export default BackupMirrorService;
