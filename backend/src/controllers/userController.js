const User = require('../models/User');
const Log = require('../models/Log');
const { HTTP_STATUS, LOG_ACTIONS, ROLES } = require('../config/constants');

// Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      users: users.map(user => user.toJSON()),
      count: users.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Create new user (Admin only)
const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: role || ROLES.USER,
      hasAccess: role === ROLES.ADMIN ? true : false // Admin gets access by default
    });

    await user.save();

    // Log the user creation
    await Log.createLog(
      req.user._id,
      req.user.name,
      LOG_ACTIONS.CREATE_USER,
      `Admin created new user: ${user.email}`,
      { 
        createdUserEmail: user.email,
        createdUserRole: user.role,
        adminEmail: req.user.email
      },
      req
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User created successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.role; // Role changes handled separately
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });

    await user.save();

    // Log the update
    await Log.createLog(
      req.user._id,
      req.user.name,
      LOG_ACTIONS.UPDATE_USER,
      `User updated: ${user.email}`,
      { 
        updatedFields: Object.keys(updates),
        targetUserEmail: user.email,
        updaterEmail: req.user.email
      },
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(id);

    // Log the deletion
    await Log.createLog(
      req.user._id,
      req.user.name,
      LOG_ACTIONS.DELETE_USER,
      `Admin deleted user: ${user.email}`,
      { 
        deletedUserEmail: user.email,
        deletedUserRole: user.role,
        adminEmail: req.user.email
      },
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Grant or revoke access (Admin only)
const grantAccess = async (req, res) => {
  try {
    const { userId, hasAccess } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update access
    user.hasAccess = hasAccess;
    await user.save();

    // Log the access change
    await Log.createLog(
      req.user._id,
      req.user.name,
      LOG_ACTIONS.GRANT_ACCESS,
      `Admin ${hasAccess ? 'granted' : 'revoked'} access for user: ${user.email}`,
      { 
        targetUserEmail: user.email,
        accessGranted: hasAccess,
        adminEmail: req.user.email
      },
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Access ${hasAccess ? 'granted' : 'revoked'} successfully`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Grant access error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to update access',
      error: error.message
    });
  }
};

// Change user role (Admin only)
const changeRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (userId === req.user._id.toString()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const oldRole = user.role;
    user.role = role;
    
    // If promoting to admin, grant access automatically
    if (role === ROLES.ADMIN) {
      user.hasAccess = true;
    }
    
    await user.save();

    // Log the role change
    await Log.createLog(
      req.user._id,
      req.user.name,
      LOG_ACTIONS.UPDATE_USER,
      `Admin changed user role from ${oldRole} to ${role}: ${user.email}`,
      { 
        targetUserEmail: user.email,
        oldRole,
        newRole: role,
        adminEmail: req.user.email
      },
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Role changed successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to change role',
      error: error.message
    });
  }
};

// Get user statistics (Admin only)
const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: ROLES.ADMIN });
    const regularUsers = await User.countDocuments({ role: ROLES.USER });
    const usersWithAccess = await User.countDocuments({ hasAccess: true });
    const usersWithoutAccess = await User.countDocuments({ hasAccess: false });

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role hasAccess createdAt');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      stats: {
        total: totalUsers,
        admins: adminUsers,
        users: regularUsers,
        withAccess: usersWithAccess,
        withoutAccess: usersWithoutAccess
      },
      recentUsers: recentUsers.map(user => user.toJSON())
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get user statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  grantAccess,
  changeRole,
  getUserStats
};
