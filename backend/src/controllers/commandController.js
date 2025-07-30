const Command = require('../models/Command');
const Log = require('../models/Log');
const esp32Service = require('../services/esp32Service');
const webSocketService = require('../services/websocketService');
const { HTTP_STATUS, LOG_ACTIONS, COMMANDS } = require('../config/constants');

// Send command to ESP32
const sendCommand = async (req, res) => {
  try {
    const { action } = req.body;
    const userId = req.user._id;
    const userName = req.user.name;

    // Validate command
    if (!action || !esp32Service.isValidCommand(action)) {
      const validCommands = Object.values(COMMANDS).join(', ');
      
      console.log(`❌ Invalid command received: '${action}'`);
      console.log(`📋 Valid commands: ${validCommands}`);
      
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: `Invalid command. Valid commands: ${validCommands}`,
        error: 'INVALID_COMMAND',
        receivedCommand: action
      });
    }

    // Create command record
    const command = new Command({
      userId,
      userName,
      action,
      timestamp: new Date()
    });

    await command.save();

    // Send command to ESP32
    const esp32Result = await esp32Service.sendCommand(action);

    // Update command with execution result
    await command.markExecuted(
      esp32Result.success ? esp32Result.message : null,
      esp32Result.success ? null : esp32Result.error
    );

    // Log the command with the actual action
    const getActionDescription = (action) => {
      const descriptions = {
        'forward': '🚗 Xe di chuyển tiến',
        'backward': '⬅️ Xe di chuyển lùi', 
        'left': '↩️ Xe rẽ trái',
        'right': '↪️ Xe rẽ phải',
        'stop': '⏹️ Xe dừng lại',
        'auto': '🤖 Bật chế độ tự động',
        'manual': '🎮 Bật chế độ thủ công'
      };
      return descriptions[action] || `User sent command: ${action}`;
    };

    await Log.createLog(
      userId,
      userName,
      action, // Use the actual command action instead of LOG_ACTIONS.SEND_COMMAND
      getActionDescription(action),
      {
        command: action,
        esp32Response: esp32Result,
        commandId: command._id
      },
      req
    );

    // Broadcast command result to all connected clients
    webSocketService.broadcastCommandResult(
      {
        id: command._id,
        action,
        userName,
        timestamp: command.timestamp
      },
      esp32Result
    );

    // Send notification if command failed
    if (!esp32Result.success) {
      webSocketService.sendNotification(
        'error',
        `Command ${action} failed: ${esp32Result.error}`,
        { command: action, user: userName }
      );
    }

    res.status(HTTP_STATUS.OK).json({
      success: esp32Result.success,
      message: esp32Result.message,
      command: {
        id: command._id,
        action,
        timestamp: command.timestamp,
        executed: command.executed
      },
      esp32Response: esp32Result
    });
  } catch (error) {
    console.error('Send command error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to send command',
      error: error.message
    });
  }
};

// Get latest command (for ESP32 polling)
const getLatestCommand = async (req, res) => {
  try {
    const latestCommand = await Command.findOne({ executed: false })
      .sort({ timestamp: 1 }) // Get oldest unexecuted command
      .populate('userId', 'name email');

    if (!latestCommand) {
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'No pending commands',
        command: null
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      command: {
        id: latestCommand._id,
        action: latestCommand.action,
        userId: latestCommand.userId._id,
        userName: latestCommand.userName,
        timestamp: latestCommand.timestamp
      }
    });
  } catch (error) {
    console.error('Get latest command error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get latest command',
      error: error.message
    });
  }
};

// Mark command as executed (for ESP32 feedback)
const markCommandExecuted = async (req, res) => {
  try {
    const { commandId, success, response, error } = req.body;

    const command = await Command.findById(commandId);
    if (!command) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Command not found'
      });
    }

    await command.markExecuted(
      success ? response : null,
      success ? null : error
    );

    // Broadcast execution result
    webSocketService.broadcastCommandResult(
      {
        id: command._id,
        action: command.action,
        userName: command.userName,
        timestamp: command.timestamp
      },
      { success, response, error }
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Command execution status updated'
    });
  } catch (error) {
    console.error('Mark command executed error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to update command status',
      error: error.message
    });
  }
};

// Get command history
const getCommandHistory = async (req, res) => {
  try {
    const { userId, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    
    // If not admin, only show user's own commands
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    } else if (userId) {
      // Admin can filter by specific user
      filter.userId = userId;
    }

    const commands = await Command.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('userId', 'name email');

    const total = await Command.countDocuments(filter);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      commands: commands.map(cmd => ({
        id: cmd._id,
        action: cmd.action,
        userId: cmd.userId._id,
        userName: cmd.userName,
        timestamp: cmd.timestamp,
        executed: cmd.executed,
        executedAt: cmd.executedAt,
        esp32Response: cmd.esp32Response,
        error: cmd.error
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get command history error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get command history',
      error: error.message
    });
  }
};

// Emergency stop
const emergencyStop = async (req, res) => {
  try {
    const userId = req.user._id;
    const userName = req.user.name;

    // Send emergency stop to ESP32
    const esp32Result = await esp32Service.emergencyStop();

    // Create emergency command record
    const command = new Command({
      userId,
      userName,
      action: COMMANDS.STOP,
      timestamp: new Date()
    });

    await command.save();
    await command.markExecuted(
      esp32Result.success ? 'Emergency stop executed' : null,
      esp32Result.success ? null : esp32Result.error
    );

    // Log the emergency stop
    await Log.createLog(
      userId,
      userName,
      LOG_ACTIONS.SEND_COMMAND,
      'Emergency stop executed',
      {
        command: 'emergency_stop',
        esp32Response: esp32Result,
        commandId: command._id
      },
      req
    );

    // Broadcast emergency stop to all clients
    webSocketService.sendNotification(
      'warning',
      `Emergency stop executed by ${userName}`,
      { user: userName, timestamp: new Date() }
    );

    res.status(HTTP_STATUS.OK).json({
      success: esp32Result.success,
      message: esp32Result.success ? 'Emergency stop executed' : 'Emergency stop failed',
      esp32Response: esp32Result
    });
  } catch (error) {
    console.error('Emergency stop error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Emergency stop failed',
      error: error.message
    });
  }
};

// Get command statistics
const getCommandStats = async (req, res) => {
  try {
    const totalCommands = await Command.countDocuments();
    const executedCommands = await Command.countDocuments({ executed: true });
    const pendingCommands = await Command.countDocuments({ executed: false });
    
    // Commands by action
    const commandsByAction = await Command.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    // Commands by user (top 5)
    const commandsByUser = await Command.aggregate([
      {
        $group: {
          _id: { userId: '$userId', userName: '$userName' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Recent commands
    const recentCommands = await Command.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'name email');

    res.status(HTTP_STATUS.OK).json({
      success: true,
      stats: {
        total: totalCommands,
        executed: executedCommands,
        pending: pendingCommands,
        byAction: commandsByAction,
        byUser: commandsByUser.map(item => ({
          userId: item._id.userId,
          userName: item._id.userName,
          count: item.count
        }))
      },
      recentCommands: recentCommands.map(cmd => ({
        id: cmd._id,
        action: cmd.action,
        userName: cmd.userName,
        timestamp: cmd.timestamp,
        executed: cmd.executed
      }))
    });
  } catch (error) {
    console.error('Get command stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get command statistics',
      error: error.message
    });
  }
};

module.exports = {
  sendCommand,
  getLatestCommand,
  markCommandExecuted,
  getCommandHistory,
  emergencyStop,
  getCommandStats
};
