const mongoose = require('mongoose');
const { LOG_ACTIONS } = require('../config/constants');

const logSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  userName: {
    type: String,
    required: [true, 'User name is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: Object.values(LOG_ACTIONS)
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
});

// Index for better query performance
logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ action: 1, timestamp: -1 });
logSchema.index({ timestamp: -1 });

// Static method to create log entry
logSchema.statics.createLog = async function(userId, userName, action, description, metadata = {}, req = null) {
  const logData = {
    userId,
    userName,
    action,
    description,
    metadata
  };

  if (req) {
    logData.ipAddress = req.ip || req.connection.remoteAddress;
    logData.userAgent = req.get('User-Agent');
  }

  return this.create(logData);
};

module.exports = mongoose.model('Log', logSchema);
