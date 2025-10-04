import { Request, Response } from 'express';
import { Notice } from '../models/Notice';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const createNoticeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  expiresAt: z.string().datetime().optional()
});

const updateNoticeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional()
});

export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = createNoticeSchema.parse(req.body);
    
    const notice = new Notice({
      ...validatedData,
      createdBy: req.user._id,
      expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
    });
    
    await notice.save();
    await notice.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      data: notice
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors?.[0]?.message || 'Validation failed'
        }
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: (Object.values(error.errors || {})[0] as any)?.message || 'Validation failed'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const getNotices = async (req: Request, res: Response) => {
  try {
    const { active = 'true', page = '1', limit = '10' } = req.query;
    
    const query: any = {};
    if (active === 'true') {
      query.isActive = true;
      query.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ];
    }
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    const notices = await Notice.find(query)
      .populate('createdBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Notice.countDocuments(query);
    
    res.json({
      success: true,
      data: notices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const updateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updateNoticeSchema.parse(req.body);
    
    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        error: {
          code: 'NOTICE_NOT_FOUND',
          message: 'Notice not found'
        }
      });
    }
    
    // Only admin or creator can update
    if (req.user.role !== 'admin' && notice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to update this notice'
        }
      });
    }
    
    Object.assign(notice, validatedData);
    if (validatedData.expiresAt) {
      notice.expiresAt = new Date(validatedData.expiresAt);
    }
    
    await notice.save();
    await notice.populate('createdBy', 'name email');
    
    res.json({
      success: true,
      data: notice
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors && error.errors[0] ? error.errors[0].message : 'Validation failed'
        }
      });
    }
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const notice = await Notice.findById(id);
    if (!notice) {
      return res.status(404).json({
        error: {
          code: 'NOTICE_NOT_FOUND',
          message: 'Notice not found'
        }
      });
    }
    
    // Only admin or creator can delete
    if (req.user.role !== 'admin' && notice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to delete this notice'
        }
      });
    }
    
    await Notice.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};
