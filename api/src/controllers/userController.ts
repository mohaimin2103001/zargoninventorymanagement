import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { UserActivity } from '../models/UserActivity';
import { logUserActivity } from '../middleware/activityLogger';

interface AuthenticatedRequest extends Request {
  user?: any; // This will be the full user object from auth middleware
}

// Get current user profile
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // req.user is already the full user object from auth middleware
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    logger.error('Get current user error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get user profile' } });
  }
};

// Update admin profile (email/password)
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const userId = req.user!._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    // Only admin can update their own profile
    if (user.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can update profile' } });
    }

    const updates: any = {};
    
    if (name && name !== user.name) {
      updates.name = name;
    }

    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already in use' } });
      }
      updates.email = email;
    }

    // Password update
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: { code: 'CURRENT_PASSWORD_REQUIRED', message: 'Current password is required' } });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters' } });
      }

      const saltRounds = 12;
      updates.passwordHash = await bcrypt.hash(newPassword, saltRounds);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: { code: 'NO_CHANGES', message: 'No changes to update' } });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-passwordHash');

    // Log activity
    await logUserActivity(userId, 'profile_updated', {
      description: 'Admin profile updated',
      changes: Object.keys(updates)
    });

    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error: any) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update profile' } });
  }
};

// Create staff user (admin only)
export const createStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const adminId = req.user!._id;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can create staff' } });
    }

    if (!name || !email) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Name and email are required' } });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: { code: 'EMAIL_TAKEN', message: 'Email already in use' } });
    }

    let passwordHash;
    let passwordSetRequired = true;

    if (password) {
      // Admin provided a password - hash it and set passwordSetRequired to false
      if (password.length < 6) {
        return res.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 6 characters' } });
      }
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
      passwordSetRequired = false;
    } else {
      // No password provided - create temporary password hash
      const tempPassword = Math.random().toString(36).slice(-8);
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(tempPassword, saltRounds);
      passwordSetRequired = true;
    }

    const staff = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'staff',
      passwordHash,
      passwordSetRequired,
      createdBy: adminId,
      isActive: true
    });

    await staff.save();

    // Log activity
    await logUserActivity(adminId, 'staff_created', {
      description: `Staff created: ${email}`,
      staffId: staff._id,
      staffEmail: email,
      passwordProvided: !!password
    });

    const staffResponse = {
      _id: staff._id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      isActive: staff.isActive,
      passwordSetRequired: staff.passwordSetRequired,
      createdAt: staff.createdAt
    };

    res.status(201).json({ 
      message: 'Staff created successfully. They will need to set their password on first login.',
      staff: staffResponse
    });
  } catch (error: any) {
    logger.error('Create staff error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to create staff' } });
  }
};

// Get all staff (admin only)
export const getAllStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!._id;
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can view staff' } });
    }

    const staff = await User.find({ role: 'staff' })
      .select('-passwordHash')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ staff });
  } catch (error: any) {
    logger.error('Get all staff error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get staff list' } });
  }
};

// Toggle staff active status (admin only)
export const toggleStaffStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const adminId = req.user!._id;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can modify staff' } });
    }

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ error: { code: 'STAFF_NOT_FOUND', message: 'Staff not found' } });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    // Log activity
    await logUserActivity(adminId, 'staff_status_changed', {
      description: `Staff ${staff.isActive ? 'activated' : 'deactivated'}: ${staff.email}`,
      staffId: staff._id,
      newStatus: staff.isActive
    });

    res.json({ 
      message: `Staff ${staff.isActive ? 'activated' : 'deactivated'} successfully`,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        isActive: staff.isActive
      }
    });
  } catch (error: any) {
    logger.error('Toggle staff status error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update staff status' } });
  }
};

export const deleteStaff = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const adminId = req.user!._id;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can delete staff' } });
    }

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ error: { code: 'STAFF_NOT_FOUND', message: 'Staff not found' } });
    }

    // Log activity before deletion
    await logUserActivity(adminId, 'staff_deleted', {
      description: `Staff deleted: ${staff.email}`,
      deletedStaffId: staff._id,
      deletedStaffEmail: staff.email
    });

    await User.findByIdAndDelete(staffId);

    res.json({ 
      message: 'Staff deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete staff error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to delete staff' } });
  }
};

// Staff sets their own password
export const setStaffPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword, confirmPassword } = req.body;

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'All fields are required' } });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: { code: 'PASSWORD_MISMATCH', message: 'Passwords do not match' } });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters' } });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    if (user.role !== 'staff') {
      return res.status(400).json({ error: { code: 'INVALID_USER', message: 'Invalid user type' } });
    }

    if (!user.passwordSetRequired) {
      return res.status(400).json({ error: { code: 'PASSWORD_ALREADY_SET', message: 'Password has already been set' } });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user
    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      passwordSetRequired: false
    });

    // Log activity
    await logUserActivity(user._id.toString(), 'password_set', {
      description: 'Staff set their password'
    });

    res.json({ message: 'Password set successfully. You can now login.' });
  } catch (error: any) {
    logger.error('Set staff password error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to set password' } });
  }
};

// Get staff activity report (admin only)
export const getStaffActivity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!._id;
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can view staff activity' } });
    }

    const { staffId, startDate, endDate, action } = req.query;

    // Build filter
    const filter: any = {};
    
    if (staffId) {
      filter.userId = staffId;
    } else {
      // Get all staff users
      const staffUsers = await User.find({ role: 'staff' }, '_id');
      filter.userId = { $in: staffUsers.map(s => s._id) };
    }

    if (startDate) {
      filter.createdAt = { $gte: new Date(startDate as string) };
    }
    if (endDate) {
      filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate as string) };
    }
    if (action) {
      filter.action = action;
    }

    const activities = await UserActivity.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(1000); // Limit to prevent large responses

    // Get activity summary by staff
    const activitySummary = await UserActivity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          totalActivities: { $sum: 1 },
          orderActivities: {
            $sum: {
              $cond: [{ $in: ['$action', ['order_created', 'order_updated', 'order_deleted']] }, 1, 0]
            }
          },
          inventoryActivities: {
            $sum: {
              $cond: [{ $in: ['$action', ['inventory_added', 'inventory_updated', 'inventory_deleted']] }, 1, 0]
            }
          },
          lastActivity: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $match: { 'user.role': 'staff' } },
      {
        $project: {
          _id: 1,
          user: { name: 1, email: 1 },
          totalActivities: 1,
          orderActivities: 1,
          inventoryActivities: 1,
          lastActivity: 1
        }
      },
      { $sort: { totalActivities: -1 } }
    ]);

    res.json({
      activities,
      summary: activitySummary
    });
  } catch (error: any) {
    logger.error('Get staff activity error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get staff activity' } });
  }
};

// Get all users for admin (admin only) - shows all user information including passwords
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user!._id;
    const admin = await User.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can view all users' } });
    }

    const users = await User.find({})
      .select('name email role isActive passwordSetRequired createdAt lastLogin createdBy')
      .populate('createdBy', 'name email')
      .sort({ role: 1, createdAt: -1 }); // Sort by role first (admin, staff), then by creation date

    const usersWithPasswordStatus = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      passwordSetRequired: user.passwordSetRequired,
      hasPassword: !!user.passwordHash,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      createdBy: user.createdBy
    }));

    res.json({
      users: usersWithPasswordStatus,
      total: usersWithPasswordStatus.length
    });
  } catch (error: any) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to get users list' } });
  }
};

// Admin updates staff password (admin only)
export const updateStaffPassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { staffId } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user!._id;

    const admin = await User.findById(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only admin can update staff passwords' } });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 6 characters' } });
    }

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ error: { code: 'STAFF_NOT_FOUND', message: 'Staff not found' } });
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update staff password
    staff.passwordHash = passwordHash;
    staff.passwordSetRequired = false;
    await staff.save();

    // Log the activity
    await UserActivity.create({
      userId: staff._id,
      action: 'password_updated_by_admin',
      details: {
        updatedBy: admin.name,
        timestamp: new Date()
      },
      ipAddress: req.ip || 'unknown'
    });

    res.json({
      message: 'Staff password updated successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        passwordSetRequired: staff.passwordSetRequired
      }
    });
  } catch (error: any) {
    logger.error('Update staff password error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to update staff password' } });
  }
};
