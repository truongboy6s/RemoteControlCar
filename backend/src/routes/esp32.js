const express = require('express');
const router = express.Router();
const esp32Service = require('../services/esp32Service');
const webSocketService = require('../services/websocketService');
const ipDiscoveryService = require('../services/ipDiscoveryService');
const { HTTP_STATUS, COMMANDS } = require('../config/constants');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// ESP32 status (no auth required for ESP32)
router.get('/status', async (req, res) => {
  try {
    const status = webSocketService.getESP32Status();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        connected: status.connected,
        count: status.count,
        devices: status.devices,
        message: status.connected ? 'ESP32 Car Online' : 'ESP32 Car Offline',
        lastUpdate: status.timestamp
      }
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get ESP32 status',
      error: error.message
    });
  }
});

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  try {
    const health = webSocketService.getHealthStatus();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      health,
      message: 'WebSocket service healthy'
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'WebSocket service unhealthy',
      error: error.message
    });
  }
});

// Ping ESP32 clients (no auth required for testing)
router.post('/ping', (req, res) => {
  try {
    console.log('🏓 Manual ping request received');
    const activeClients = webSocketService.pingESP32Clients();
    res.status(HTTP_STATUS.OK).json({
      success: true,
      activeClients,
      message: `Pinged ${activeClients} ESP32 client(s)`
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to ping ESP32 clients',
      error: error.message
    });
  }
});

// Network discovery endpoint for ESP32 (no auth required)
router.get('/network/discover', (req, res) => {
  try {
    const networkInfo = ipDiscoveryService.getNetworkInfo();
    const ipRanges = ipDiscoveryService.getIPRangesForESP32();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      currentIP: networkInfo.currentIP,
      serverPorts: [3000, 3001],
      ipRanges: ipRanges,
      allIPs: networkInfo.allIPs.map(ip => ({
        ip: ip.ip,
        interface: ip.interface,
        isHotspot: ip.isHotspot
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to get network info',
      error: error.message
    });
  }
});

// IP broadcast endpoint for ESP32 discovery
router.get('/network/broadcast', (req, res) => {
  try {
    const networkInfo = ipDiscoveryService.getNetworkInfo();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Backend server found',
      serverIP: networkInfo.currentIP,
      serverPorts: {
        http: 3000,
        websocket: 3001
      },
      websocketURL: `ws://${networkInfo.currentIP}:3001`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Network info unavailable',
      error: error.message
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
