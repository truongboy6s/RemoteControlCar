const mongoose = require('mongoose');
const { COMMANDS } = require('../config/constants');

const commandSchema = new mongoose.Schema({
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
    enum: Object.values(COMMANDS),
    required: [true, 'Action is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  executed: {
    type: Boolean,
    default: false
  },
  executedAt: {
    type: Date
  },
  esp32Response: {
    type: String
  },
  error: {
    type: String
  }
});

// Index for better query performance
commandSchema.index({ userId: 1, timestamp: -1 });
commandSchema.index({ executed: 1, timestamp: -1 });

// Mark command as executed
commandSchema.methods.markExecuted = function(response = null, error = null) {
  this.executed = true;
  this.executedAt = new Date();
  if (response) this.esp32Response = response;
  if (error) this.error = error;
  return this.save();
};

module.exports = mongoose.model('Command', commandSchema);
