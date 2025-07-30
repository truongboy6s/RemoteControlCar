const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');
const { HTTP_STATUS, LOG_ACTIONS, JWT_EXPIRES_IN, ROLES } = require('../config/constants');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

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
      role: ROLES.USER,
      hasAccess: false // Admin needs to grant access
    });

    await user.save();

    // Log the registration
    await Log.createLog(
      user._id,
      user.name,
      LOG_ACTIONS.REGISTER,
      `New user registered: ${user.email}`,
      { email: user.email },
      req
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: 'User registered successfully. Please wait for admin to grant access.',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`Attempting login for: ${email}`);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log(`User found: ${user.name} (${user.role})`);

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log(`Password validation result: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      console.log(`Invalid password for: ${email}`);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);
    console.log(`Generated token for: ${user.name}`);

    // Log the login
    await Log.createLog(
      user._id,
      user.name,
      LOG_ACTIONS.LOGIN,
      `User logged in: ${user.email}`,
      { email: user.email },
      req
    );

    console.log(`✅ Login successful for: ${user.name} (${user.role})`);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify old password
    const isOldPasswordValid = await user.comparePassword(oldPassword);
    if (!isOldPasswordValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log the password change
    await Log.createLog(
      user._id,
      user.name,
      LOG_ACTIONS.CHANGE_PASSWORD,
      'User changed password',
      {},
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Password change failed',
      error: error.message
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
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
    console.error('Get profile error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Logout (optional - mainly for logging)
const logout = async (req, res) => {
  try {
    // Log the logout
    await Log.createLog(
      req.user._id,
      req.user.name,
      LOG_ACTIONS.LOGOUT,
      `User logged out: ${req.user.email}`,
      { email: req.user.email },
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  changePassword,
  getProfile,
  logout
};
