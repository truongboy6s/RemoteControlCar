const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { HTTP_STATUS } = require('../config/constants');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid token - user not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// Check if user has access to control car
const checkAccess = (req, res, next) => {
  if (!req.user.hasAccess && !req.user.isAdmin()) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied. Contact administrator to grant access.'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  checkAccess
};
