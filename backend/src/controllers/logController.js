const Log = require('../models/Log');
const { HTTP_STATUS, LOG_ACTIONS } = require('../config/constants');

// Get logs
const getLogs = async (req, res) => {
  try {
    const { userId, action, limit = 50, page = 1, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    // If not admin, only show user's own logs
    if (req.user.role !== 'admin' && !userId) {
      filter.userId = req.user._id;
    } else if (userId) {
      filter.userId = userId;
    }

    // Filter by action
    if (action && action !== 'all') {
      filter.action = action;
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'name email role');

    const total = await Log.countDocuments(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      logs: logs.map(log => ({
        id: log._id ? log._id.toString() : '',
        userId: log.userId ? log.userId._id ? log.userId._id.toString() : null : null,
        userName: log.userName || 'Unknown User',
        userEmail: log.userId && log.userId.email ? log.userId.email : 'Unknown Email',
        userRole: log.userId && log.userId.role ? log.userId.role : 'unknown',
        action: log.action || '',
        description: log.description || '',
        timestamp: log.timestamp || new Date(),
        metadata: log.metadata || {},
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || ''
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get logs',
      error: error.message
    });
  }
};

// Get user's own logs - ONLY MOVEMENT COMMANDS
const getUserLogs = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Only show movement-related logs for regular users
    const movementActions = ['forward', 'backward', 'left', 'right', 'stop', 'auto', 'manual'];
    
    let filter = { 
      userId,
      action: { $in: movementActions }
    };

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Log.countDocuments(filter);

    // Format movement descriptions for better user experience
    const formatMovementDescription = (action, description) => {
      const movementMap = {
        'forward': '🚗 Xe di chuyển tiến',
        'backward': '⬅️ Xe di chuyển lùi',
        'left': '↩️ Xe rẽ trái',
        'right': '↪️ Xe rẽ phải',
        'stop': '⏹️ Xe dừng lại',
        'auto': '🤖 Bật chế độ tự động',
        'manual': '🎮 Bật chế độ thủ công'
      };
      return movementMap[action] || description;
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      logs: logs.map(log => ({
        id: log._id ? log._id.toString() : '',
        action: log.action || '',
        description: formatMovementDescription(log.action || '', log.description || ''),
        timestamp: log.timestamp || new Date(),
        type: 'movement'
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user logs error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get user logs',
      error: error.message
    });
  }
};

// Get logs with category filtering for admin
const getLogsByCategory = async (req, res) => {
  try {
    const { category = 'all', limit = 50, page = 1, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    // Define categories
    const categories = {
      'commands': ['forward', 'backward', 'left', 'right', 'stop', 'auto', 'manual', 'auto_on', 'auto_off', 'manual_on', 'manual_off'],
      'login': ['login', 'logout', 'login_failed', 'token_refresh'],
      'user_management': ['user_created', 'user_updated', 'user_deleted', 'password_changed', 'role_changed'],
      'all': [] // All logs
    };

    // Filter by category
    if (category !== 'all' && categories[category]) {
      filter.action = { $in: categories[category] };
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'name email role');

    const total = await Log.countDocuments(filter);

    // Add category information to each log
    const getCategoryForAction = (action) => {
      for (const [cat, actions] of Object.entries(categories)) {
        if (actions.includes(action)) return cat;
      }
      return 'other';
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      category,
      logs: logs.map(log => ({
        id: log._id ? log._id.toString() : '',
        userId: log.userId ? log.userId._id ? log.userId._id.toString() : null : null,
        userName: log.userName || 'Unknown User',
        userEmail: log.userId && log.userId.email ? log.userId.email : 'Unknown Email',
        userRole: log.userId && log.userId.role ? log.userId.role : 'unknown',
        action: log.action || '',
        description: log.description || '',
        timestamp: log.timestamp || new Date(),
        metadata: log.metadata || {},
        ipAddress: log.ipAddress || '',
        userAgent: log.userAgent || '',
        category: getCategoryForAction(log.action || '')
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      availableCategories: {
        'all': 'Tất cả logs',
        'commands': 'Lệnh điều khiển xe',
        'login': 'Đăng nhập/Đăng xuất',
        'user_management': 'Quản lý người dùng'
      }
    });
  } catch (error) {
    console.error('Get logs by category error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get logs by category',
      error: error.message
    });
  }
};

// Get log statistics with category breakdown
const getLogStatsWithCategories = async (req, res) => {
  try {
    const totalLogs = await Log.countDocuments();
    
    // Define categories
    const categories = {
      'commands': ['forward', 'backward', 'left', 'right', 'stop', 'auto', 'manual', 'auto_on', 'auto_off', 'manual_on', 'manual_off'],
      'login': ['login', 'logout', 'login_failed', 'token_refresh'],
      'user_management': ['user_created', 'user_updated', 'user_deleted', 'password_changed', 'role_changed']
    };

    // Get counts by category
    const categoryStats = {};
    for (const [category, actions] of Object.entries(categories)) {
      categoryStats[category] = await Log.countDocuments({
        action: { $in: actions }
      });
    }

    // Logs by action
    const logsByAction = await Log.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const recentActivity = await Log.countDocuments({
      timestamp: { $gte: oneDayAgo }
    });

    // Most active users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUsers = await Log.aggregate([
      {
        $match: {
          timestamp: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { userId: '$userId', userName: '$userName' },
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      stats: {
        total: totalLogs,
        recentActivity,
        byCategory: categoryStats,
        byAction: logsByAction,
        activeUsers: activeUsers.map(item => ({
          userId: item._id.userId,
          userName: item._id.userName,
          count: item.count,
          lastActivity: item.lastActivity
        }))
      }
    });
  } catch (error) {
    console.error('Get log stats with categories error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get log statistics',
      error: error.message
    });
  }
};

// Delete old logs (Admin only)
const deleteOldLogs = async (req, res) => {
  try {
    const { days = 30 } = req.body;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Log.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    // Log the cleanup action
    await Log.createLog(
      req.user._id,
      req.user.name,
      'log_cleanup',
      `Admin deleted logs older than ${days} days`,
      {
        deletedCount: result.deletedCount,
        cutoffDate,
        adminEmail: req.user.email
      },
      req
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: `Deleted ${result.deletedCount} old logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Delete old logs error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to delete old logs',
      error: error.message
    });
  }
};

// Export logs (Admin only)
const exportLogs = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;
    
    let filter = {};
    
    // Filter by date range
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const logs = await Log.find(filter)
      .sort({ timestamp: -1 })
      .populate('userId', 'name email role');

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeader = 'Timestamp,User Name,User Email,Action,Description,IP Address\n';
      const csvData = logs.map(log => 
        `"${log.timestamp}","${log.userName || 'Unknown User'}","${log.userId ? log.userId.email : 'Unknown Email'}","${log.action}","${log.description || ''}","${log.ipAddress || ''}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="logs.csv"');
      res.status(HTTP_STATUS.OK).send(csvHeader + csvData);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="logs.json"');
      res.status(HTTP_STATUS.OK).json({
        success: true,
        exportDate: new Date(),
        totalLogs: logs.length,
        logs: logs.map(log => ({
          timestamp: log.timestamp || new Date(),
          userName: log.userName || 'Unknown User',
          userEmail: log.userId && log.userId.email ? log.userId.email : 'Unknown Email',
          userRole: log.userId && log.userId.role ? log.userId.role : 'unknown',
          action: log.action || '',
          description: log.description || '',
          metadata: log.metadata || {},
          ipAddress: log.ipAddress || '',
          userAgent: log.userAgent || ''
        }))
      });
    }

    // Log the export action
    await Log.createLog(
      req.user._id,
      req.user.name,
      'log_export',
      `Admin exported ${logs.length} logs`,
      {
        exportFormat: format,
        logCount: logs.length,
        dateRange: { startDate, endDate },
        adminEmail: req.user.email
      },
      req
    );
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to export logs',
      error: error.message
    });
  }
};

module.exports = {
  getLogs,
  getUserLogs,
  getLogsByCategory,
  getLogStats: getLogStatsWithCategories,
  deleteOldLogs,
  exportLogs
};
