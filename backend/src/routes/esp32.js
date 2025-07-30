const express = require('express');
const router = express.Router();
const esp32Service = require('../services/esp32Service');
const webSocketService = require('../services/websocketService');
const { HTTP_STATUS, COMMANDS } = require('../config/constants');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ESP32 status (no auth required for ESP32)
router.get('/status', async (req, res) => {
  try {
    const webSocketService = require('../services/websocketService');
    const wsStatus = webSocketService.getESP32Status();
    const status = esp32Service.getConnectionStatus();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      ...status,
      websocket: wsStatus,
      esp32Online: wsStatus.connected && wsStatus.count > 0,
      message: wsStatus.connected && wsStatus.count > 0 ? 
               'ESP32 Car đang kết nối' : 
               'ESP32 Car offline'
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message,
      esp32Online: false,
      message: 'ESP32 Car offline'
    });
  }
});

// Receive sensor data from ESP32 (no auth required)
router.post('/sensor/data', async (req, res) => {
  try {
    const sensorData = req.body;
    
    // Validate sensor data
    if (!sensorData.distance || typeof sensorData.distance !== 'number') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid sensor data'
      });
    }

    // Add timestamp if not provided
    if (!sensorData.timestamp) {
      sensorData.timestamp = new Date().toISOString();
    }

    // Broadcast sensor data to all connected clients
    webSocketService.broadcastToAll('sensor_data', {
      success: true,
      data: sensorData
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Sensor data received'
    });
  } catch (error) {
    console.error('Sensor data error:', error);
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message
    });
  }
});

// Protected routes below require authentication
router.use(authenticateToken);

// Get current sensor data
router.get('/sensor/current', async (req, res) => {
  try {
    const result = await esp32Service.getSensorData();
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message
    });
  }
});

// Check ESP32 connection (admin only)
router.get('/connection/check', requireAdmin, async (req, res) => {
  try {
    const result = await esp32Service.checkConnection();
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message
    });
  }
});

// Get WebSocket statistics (admin only)
router.get('/websocket/stats', requireAdmin, (req, res) => {
  try {
    const stats = webSocketService.getStats();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message
    });
  }
});

// Send test notification (admin only)
router.post('/notification/test', requireAdmin, (req, res) => {
  try {
    const { type = 'info', message = 'Test notification' } = req.body;
    
    webSocketService.sendNotification(type, message, {
      sender: req.user.name,
      timestamp: new Date()
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Test notification sent'
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message
    });
  }
});

// Change mode (auto/manual) - requires authentication
router.post('/mode', authenticateToken, async (req, res) => {
  try {
    const { mode } = req.body;
    
    // Validate mode
    if (!mode || !['auto', 'manual'].includes(mode)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid mode. Valid modes: auto, manual'
      });
    }

    const command = mode === 'auto' ? COMMANDS.AUTO : COMMANDS.MANUAL;
    
    // Send mode command to ESP32
    const result = await esp32Service.sendCommand(command);
    
    // Broadcast mode change to all clients
    webSocketService.broadcastToAll('mode_change', {
      mode: mode,
      command: command,
      success: result.success,
      timestamp: new Date().toISOString(),
      user: req.user.name
    });

    res.status(HTTP_STATUS.OK).json({
      success: result.success,
      message: result.message,
      mode: mode,
      command: command
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
