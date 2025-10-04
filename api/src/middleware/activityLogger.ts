import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { UserActivity } from '../models/UserActivity';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export const logActivity = (action: string, details?: any) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Only log if the request was successful (status < 400)
      if (res.statusCode < 400 && req.user) {
        // Log activity asynchronously to not block the response
        setImmediate(async () => {
          try {
            await UserActivity.create({
              userId: req.user!.userId,
              action,
              details: {
                ...details,
                description: `${action.replace(/_/g, ' ')} by ${req.user!.email}`,
                ...req.body // Include request body data if relevant
              },
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent')
            });
          } catch (error) {
            logger.error('Failed to log user activity:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

export const logUserActivity = async (
  userId: string,
  action: string,
  details?: any,
  req?: AuthenticatedRequest
) => {
  try {
    await UserActivity.create({
      userId,
      action,
      details,
      ipAddress: req?.ip || req?.connection.remoteAddress,
      userAgent: req?.get('User-Agent')
    });
  } catch (error) {
    logger.error('Failed to log user activity:', error);
  }
};

