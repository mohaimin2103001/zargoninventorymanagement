import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { generateToken } from '../middleware/auth';
import { registerSchema, loginSchema } from '../schemas';
import { logUserActivity } from '../middleware/activityLogger';
import { z } from 'zod';

// Add a password setting schema for staff
const setPasswordSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(6),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const register = async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const existingUser = await User.findOne({ email: validatedData.email });
    if (existingUser) {
      return res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: 'A user with this email already exists'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    
    const user = new User({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash: hashedPassword,
      role: 'admin' // First user is admin
    });

    await user.save();

    const token = generateToken(user._id.toString());

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      });
    }

    logger.error('Registration error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const user = await User.findOne({ email: validatedData.email });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Your account has been deactivated. Please contact admin.'
        }
      });
    }

    // Check if staff needs to set password
    if (user.passwordSetRequired) {
      return res.status(202).json({
        error: {
          code: 'PASSWORD_SET_REQUIRED',
          message: 'You need to set your password before logging in.'
        },
        user: {
          email: user.email,
          name: user.name,
          passwordSetRequired: true
        }
      });
    }

    const isValidPassword = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Log login activity
    await logUserActivity(user._id.toString(), 'login', {
      description: `User logged in: ${user.email}`,
      loginTime: new Date()
    }, req);

    const token = generateToken(user._id.toString());

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: new Date()
      },
      token
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
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

// Add staff password setting endpoint
export const setStaffPassword = async (req: Request, res: Response) => {
  try {
    const validatedData = setPasswordSchema.parse(req.body);
    
    const user = await User.findOne({ 
      email: validatedData.email,
      passwordSetRequired: true 
    });
    
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found or password has already been set'
        }
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);
    
    // Update user with new password and remove password set requirement
    await User.findByIdAndUpdate(user._id, {
      passwordHash: hashedPassword,
      passwordSetRequired: false,
      lastLogin: new Date()
    });

    // Log password setting activity
    await logUserActivity(user._id.toString(), 'staff_password_set', {
      description: `Staff member ${user.email} set their initial password`,
      actionTime: new Date()
    }, req);

    // Generate token for immediate login after password setting
    const token = generateToken(user._id.toString());

    res.json({
      message: 'Password set successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: new Date()
      },
      token
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please provide valid password data',
          details: error.errors
        }
      });
    }
    
    logger.error('Set password error:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'An error occurred while setting password'
      }
    });
  }
};
