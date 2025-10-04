import { logger } from './logger';
import BackupMirrorService from '../backup/mirror';

export async function mirrorInventoryItem(
  operation: 'insert' | 'update' | 'delete', 
  document: any
): Promise<void> {
  try {
    const mirrorService = BackupMirrorService.getInstance();
    await mirrorService.mirrorInventoryItem(operation, document.toObject ? document.toObject() : document);
  } catch (error) {
    logger.warn(`Mirror operation failed for inventory item (non-critical):`, error);
  }
}

/**
 * Mirror an order to backup database
 * Safe to call - will not throw errors, just logs warnings if mirroring fails
 */
export async function mirrorOrder(
  operation: 'insert' | 'update' | 'delete', 
  document: any
): Promise<void> {
  try {
    const mirrorService = BackupMirrorService.getInstance();
    await mirrorService.mirrorOrder(operation, document.toObject ? document.toObject() : document);
  } catch (error) {
    logger.warn(`Mirror operation failed for order (non-critical):`, error);
  }
}

/**
 * Check if mirroring is configured and available
 */
export function isMirrorConfigured(): boolean {
  try {
    const mirrorService = BackupMirrorService.getInstance();
    return mirrorService.isMirrorConfigured();
  } catch {
    return false;
  }
}

