const { HTTP_STATUS, ROLES } = require('../config/constants');

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Check if user can modify another user (only admin or self)
const canModifyUser = (req, res, next) => {
  const targetUserId = req.params.id || req.params.userId;
  
  // Admin can modify anyone
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }
  
  // User can only modify themselves
  if (req.user._id.toString() === targetUserId) {
    return next();
  }
  
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    message: 'You can only modify your own account'
  });
};

module.exports = {
  requireAdmin,
  canModifyUser
};
