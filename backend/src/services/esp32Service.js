const axios = require('axios');
const { COMMANDS } = require('../config/constants');

class ESP32Service {
  constructor() {
    this.esp32IP = process.env.ESP32_IP || '192.168.1.100';
    this.esp32Port = process.env.ESP32_PORT || '80';
    this.baseURL = `http://${this.esp32IP}:${this.esp32Port}`;
    this.timeout = 5000; // 5 seconds timeout
    this.isConnected = false;
    this.lastSensorData = null;
  }

  // Send command to ESP32 via WebSocket
  async sendCommand(action) {
    try {
      console.log(`📤 Sending command to ESP32: ${action}`);
      
      // Get WebSocket service instance
      const webSocketService = require('./websocketService');
      
      // Create command object
      const commandData = {
        action: action,
        timestamp: new Date().toISOString(),
        source: 'api'
      };
      
      // Send command via WebSocket
      const sent = webSocketService.sendCommandToESP32(action, commandData);
      
      if (sent) {
        console.log(`✅ Command ${action} sent to ESP32 via WebSocket`);
        return {
          success: true,
          message: `Command ${action} sent to ESP32`,
          method: 'websocket',
          data: commandData
        };
      } else {
        console.log(`❌ No ESP32 connected via WebSocket`);
        return {
          success: false,
          error: 'ESP32 not connected',
          message: `Failed to send command ${action} - ESP32 not connected via WebSocket`
        };
      }
    } catch (error) {
      console.error('❌ ESP32 WebSocket communication error:', error.message);
      
      return {
        success: false,
        error: error.message,
        message: `Failed to send command ${action} to ESP32: ${error.message}`
      };
    }
  }

  // Get sensor data from ESP32 via WebSocket
  async getSensorData() {
    try {
      const webSocketService = require('./websocketService');
      const status = webSocketService.getESP32Status();
      
      if (status.connected && status.batteryData) {
        this.isConnected = true;
        this.lastSensorData = {
          ...status.batteryData,
          esp32Status: status,
          timestamp: new Date().toISOString(),
          method: 'websocket'
        };

        return {
          success: true,
          data: this.lastSensorData
        };
      } else {
        return {
          success: false,
          error: 'No sensor data available',
          data: this.lastSensorData // Return last known data
        };
      }
    } catch (error) {
      this.isConnected = false;
      console.error('ESP32 sensor read error:', error.message);
      
      return {
        success: false,
        error: error.message,
        data: this.lastSensorData // Return last known data
      };
    }
  }

  // Check ESP32 connection via WebSocket
  async checkConnection() {
    try {
      const webSocketService = require('./websocketService');
      const status = webSocketService.getESP32Status();
      
      this.isConnected = status.connected;
      
      return {
        success: true,
        connected: status.connected,
        data: {
          esp32Count: status.count,
          devices: status.devices,
          batteryData: status.batteryData,
          method: 'websocket'
        }
      };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  }

  // Validate command
  isValidCommand(action) {
    const isValid = Object.values(COMMANDS).includes(action);
    
    console.log(`🔍 Validating command '${action}':`, isValid ? '✅ Valid' : '❌ Invalid');
    if (!isValid) {
      console.log(`📋 Valid commands: ${Object.values(COMMANDS).join(', ')}`);
    }
    
    return isValid;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      esp32IP: this.esp32IP,
      esp32Port: this.esp32Port,
      lastSensorData: this.lastSensorData
    };
  }

  // Emergency stop
  async emergencyStop() {
    return await this.sendCommand(COMMANDS.STOP);
  }
}

// Create singleton instance
const esp32Service = new ESP32Service();

module.exports = esp32Service;
