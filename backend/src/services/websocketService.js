const { Server } = require('socket.io');
const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.io = null;
    this.wss = null;
    this.connectedClients = new Map();
    this.esp32Clients = new Map();
    this.sensorInterval = null;
    this.lastBatteryData = null;
    this.commandHistory = [];
    this.isInitialized = false;
  }

  initialize(server) {
    if (this.isInitialized) {
      console.log('WebSocket service already initialized');
      return;
    }

    try {
      this.io = new Server(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
      });

      this.initializeESP32WebSocket();
      this.setupSocketIOHandlers();
      this.setupWebSocketHandlers();
      this.startSensorDataBroadcast();

      this.isInitialized = true;
      console.log('✅ WebSocket service initialized successfully');
      console.log('📱 Socket.IO server: ws://localhost:3000');
      console.log('🤖 Raw WebSocket server: ws://localhost:3001');
    } catch (error) {
      console.error('❌ Error initializing WebSocket service:', error);
      throw error;
    }
  }

  initializeESP32WebSocket() {
    try {
      this.wss = new WebSocket.Server({
        port: 3001,
        perMessageDeflate: false,
        clientTracking: true
      });
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log('Port 3001 in use, trying 3002...');
        this.wss = new WebSocket.Server({
          port: 3002,
          perMessageDeflate: false,
          clientTracking: true
        });
      } else {
        throw error;
      }
    }
  }

  setupSocketIOHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📱 Flutter client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, {
        socket,
        connectedAt: new Date(),
        type: 'flutter'
      });

      socket.emit('welcome', {
        message: 'Connected to ESP32 Car Control Server',
        esp32Status: this.getESP32Status(),
        batteryData: this.lastBatteryData,
        serverTime: new Date().toISOString()
      });

      socket.on('command', (data) => {
        console.log(`📱➡️🤖 Command from Flutter: ${data.action}`);
        const commandInfo = {
          id: Date.now(),
          action: data.action,
          timestamp: new Date(),
          source: 'flutter',
          clientId: socket.id
        };
        this.commandHistory.push(commandInfo);
        if (this.commandHistory.length > 100) this.commandHistory.shift();

        const sent = this.sendCommandToESP32(data.action, commandInfo);

        socket.emit('command_result', {
          success: sent,
          action: data.action,
          message: sent ? 'Command sent to ESP32' : 'ESP32 not connected',
          timestamp: new Date().toISOString()
        });
      });

      socket.on('change_mode', (data) => {
        this.sendCommandToESP32('mode_' + data.mode, {
          action: 'mode_' + data.mode,
          mode: data.mode,
          timestamp: new Date()
        });
      });

      socket.on('request_battery', () => {
        if (this.lastBatteryData) {
          socket.emit('battery_data', this.lastBatteryData);
        } else {
          this.sendCommandToESP32('get_battery', { action: 'get_battery' });
        }
      });

      socket.on('disconnect', () => {
        console.log(`📱❌ Flutter client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      this.sendESP32Status(socket);
    });
  }

  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      const clientId = `esp32_${Date.now()}`;
      const clientIP = req.socket.remoteAddress;
      console.log(`🤖✅ ESP32 WebSocket connected: ${clientId} from ${clientIP}`);

      this.esp32Clients.set(clientId, {
        socket: ws,
        connectedAt: new Date(),
        type: 'esp32',
        ip: clientIP,
        lastHeartbeat: new Date()
      });

      ws.send(JSON.stringify({
        type: 'connection_confirmed',
        clientId: clientId,
        serverTime: new Date().toISOString()
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          const client = this.esp32Clients.get(clientId);
          if (client) client.lastHeartbeat = new Date();

          switch (data.type) {
            case 'device_info':
              this.broadcastToFlutter('esp32_connected', {
                ...data,
                clientId,
                connectedAt: new Date().toISOString()
              });
              break;
            case 'sensor':
              this.broadcastToFlutter('sensor_data', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'battery':
              this.lastBatteryData = {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              };
              this.broadcastToFlutter('battery_data', this.lastBatteryData);
              break;
            case 'command_status':
              this.broadcastToFlutter('command_status', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'heartbeat':
              this.broadcastToFlutter('esp32_heartbeat', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'mode_change':
              console.log(`🤖 ESP32 mode changed to: ${data.mode}`);
              this.broadcastToFlutter('mode_change', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'error':
              this.broadcastToFlutter('esp32_error', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'log':
              this.broadcastToFlutter('esp32_log', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
          }
        } catch (err) {
          console.error('❌ Error parsing ESP32 message:', err);
          console.error('Raw message:', message.toString());
        }
      });

      ws.on('close', () => {
        console.log(`🤖❌ ESP32 WebSocket disconnected: ${clientId}`);
        this.esp32Clients.delete(clientId);

        // Broadcast ESP32 disconnection to all Flutter clients
        this.broadcastToFlutter('esp32_disconnected', {
          device: 'ESP32_Car',
          clientId,
          disconnectedAt: new Date().toISOString(),
          status: 'offline',
          message: 'ESP32 Car đã mất kết nối'
        });

        // Send updated ESP32 status to all clients
        this.broadcastESP32Status();
      });

      ws.on('error', (error) => {
        this.broadcastToFlutter('esp32_error', {
          type: 'connection_error',
          error: error.message,
          clientId
        });
      });
    });
  }

  sendCommandToESP32(action, commandInfo = null) {
    const command = {
      type: 'command',
      action,
      timestamp: Date.now(),
      id: commandInfo?.id || Date.now()
    };

    let sent = false;
    let sentCount = 0;

    this.esp32Clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(JSON.stringify(command));
          sent = true;
          sentCount++;
        } catch (error) {
          console.error(`❌ Error sending command to ESP32 (${clientId}):`, error);
        }
      }
    });

    return sent;
  }

  broadcastToFlutter(event, data) {
    this.io.emit(event, data);
  }

  broadcastCommandResult(commandInfo, esp32Result) {
    const message = {
      type: 'command_result',
      command: commandInfo.action || commandInfo.command,
      result: esp32Result || 'executed',
      timestamp: Date.now(),
      esp32Connected: this.esp32Clients.size > 0
    };

    this.broadcastToFlutter('command_result', message);
  }

  sendNotification(type, message, data = {}) {
    const notification = {
      type: 'notification',
      notificationType: type,
      message,
      data,
      timestamp: Date.now()
    };

    this.broadcastToFlutter('notification', notification);
  }

  // Broadcast ESP32 status to all clients
  broadcastESP32Status() {
    const status = this.getESP32Status();
    this.broadcastToFlutter('esp32_status', status);
  }

  startSensorDataBroadcast() {
    if (this.sensorInterval) clearInterval(this.sensorInterval);

    this.sensorInterval = setInterval(() => {
      if (this.connectedClients.size > 0) {
        const status = this.getESP32Status();
        
        // Broadcast ESP32 status every 3 seconds
        this.broadcastToFlutter('esp32_status', status);

        // Request battery data every 30 seconds
        if (Date.now() % 30000 < 3000) {
          this.sendCommandToESP32('get_battery');
        }
        
        // Check for dead ESP32 connections and clean them up
        this.cleanupDeadConnections();
      }
    }, 3000);
  }

  // Clean up dead ESP32 connections
  cleanupDeadConnections() {
    const now = Date.now();
    const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

    this.esp32Clients.forEach((client, clientId) => {
      if (client.lastHeartbeat && (now - client.lastHeartbeat.getTime()) > HEARTBEAT_TIMEOUT) {
        console.log(`🤖💀 ESP32 connection timeout: ${clientId}`);
        
        // Close the connection
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.terminate();
        }
        
        // Remove from clients
        this.esp32Clients.delete(clientId);
        
        // Broadcast disconnection
        this.broadcastToFlutter('esp32_disconnected', {
          device: 'ESP32_Car',
          clientId,
          disconnectedAt: new Date().toISOString(),
          status: 'offline',
          message: 'ESP32 Car mất kết nối (timeout)',
          reason: 'heartbeat_timeout'
        });
      }
    });
  }

  sendESP32Status(socket) {
    const status = this.getESP32Status();
    socket.emit('esp32_status', status);
  }

  getESP32Status() {
    const esp32Count = this.esp32Clients.size;
    const esp32Info = [];

    this.esp32Clients.forEach((client, clientId) => {
      esp32Info.push({
        id: clientId,
        connectedAt: client.connectedAt,
        connected: client.socket.readyState === WebSocket.OPEN,
        ip: client.ip || 'unknown',
        lastHeartbeat: client.lastHeartbeat,
        connectionDuration: Date.now() - client.connectedAt.getTime()
      });
    });

    return {
      connected: esp32Count > 0,
      count: esp32Count,
      devices: esp32Info,
      batteryData: this.lastBatteryData,
      timestamp: new Date().toISOString()
    };
  }

  getCommandHistory(limit = 20) {
    return this.commandHistory.slice(-limit);
  }

  getBatteryStatus() {
    return this.lastBatteryData || {
      voltage: 0,
      percentage: 0,
      status: 'unknown',
      powerSaveMode: false,
      timestamp: new Date().toISOString()
    };
  }

  getStats() {
    return {
      socketIOClients: this.connectedClients.size,
      esp32Clients: this.esp32Clients.size,
      uptime: process.uptime(),
      commandHistorySize: this.commandHistory.length,
      lastBatteryUpdate: this.lastBatteryData?.timestamp || 'never',
      isInitialized: this.isInitialized,
      wsServerPort: this.wss?.options?.port || 'not started'
    };
  }

  close() {
    console.log('🔄 Closing WebSocket service...');
    if (this.sensorInterval) clearInterval(this.sensorInterval);
    if (this.io) this.io.close();
    if (this.wss) this.wss.close();

    this.connectedClients.clear();
    this.esp32Clients.clear();
    this.io = null;
    this.wss = null;
    this.sensorInterval = null;
    this.isInitialized = false;

    console.log('✅ WebSocket service closed');
  }
}

const webSocketService = new WebSocketService();
module.exports = webSocketService;
