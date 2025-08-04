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
      console.log('📱 Socket.IO server: ws://0.0.0.0:3000');
      console.log('🤖 Raw WebSocket server: ws://0.0.0.0:3001');
      console.log('🌐 Hotspot access:');
      console.log('   - Socket.IO: ws://172.20.10.2:3000');
      console.log('   - WebSocket: ws://172.20.10.2:3001');
    } catch (error) {
      console.error('❌ Error initializing WebSocket service:', error);
      throw error;
    }
  }

  initializeESP32WebSocket() {
    try {
      this.wss = new WebSocket.Server({
        port: 3001,
        host: '0.0.0.0',
        perMessageDeflate: false,
        clientTracking: true
      });
      console.log('🔌 ESP32 WebSocket server listening on 0.0.0.0:3001');
      console.log('📱 Accessible from hotspot: ws://172.20.10.2:3001');
    } catch (error) {
      if (error.code === 'EADDRINUSE') {
        console.log('Port 3001 in use, trying 3002...');
        this.wss = new WebSocket.Server({
          port: 3002,
          host: '0.0.0.0',
          perMessageDeflate: false,
          clientTracking: true
        });
        console.log('🔌 ESP32 WebSocket server listening on 0.0.0.0:3002');
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
      const userAgent = req.headers['user-agent'];
      
      console.log(`🤖✅ ESP32 WebSocket connected: ${clientId}`);
      console.log(`   IP: ${clientIP}`);
      console.log(`   User-Agent: ${userAgent || 'Unknown'}`);
      console.log(`   Connection time: ${new Date().toLocaleString()}`);

      this.esp32Clients.set(clientId, {
        socket: ws,
        connectedAt: new Date(),
        type: 'esp32',
        ip: clientIP,
        lastHeartbeat: new Date(),
        userAgent: userAgent
      });

      ws.send(JSON.stringify({
        type: 'connection_confirmed',
        clientId: clientId,
        serverTime: new Date().toISOString(),
        serverIP: '172.20.10.2',
        networkInfo: {
          clientIP: clientIP,
          serverPort: 3001
        }
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          const client = this.esp32Clients.get(clientId);
          if (client) client.lastHeartbeat = new Date();

          // Log important messages
          if (data.type === 'device_info') {
            console.log(`🤖📋 ESP32 Device Info: ${JSON.stringify(data, null, 2)}`);
          } else if (data.type === 'sensor') {
            console.log(`🤖📊 Sensor Data - Distance: ${data.data?.distance}cm, Mode: ${data.data?.mode}`);
          }

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
              console.log(`🤖✅ Command executed: ${data.command} - ${data.status}`);
              this.broadcastToFlutter('command_status', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'heartbeat':
              // Don't log heartbeat to reduce noise
              this.broadcastToFlutter('esp32_heartbeat', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'mode_change':
              console.log(`🤖🔄 ESP32 mode changed to: ${data.mode}`);
              this.broadcastToFlutter('mode_change', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'error':
              console.error(`🤖❌ ESP32 Error: ${data.message}`);
              this.broadcastToFlutter('esp32_error', {
                ...data,
                clientId,
                timestamp: new Date().toISOString()
              });
              break;
            case 'log':
              console.log(`🤖📝 ESP32 Log: ${data.message}`);
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
        this.broadcastToFlutter('esp32_disconnected', {
          device: 'ESP32_Car',
          clientId,
          disconnectedAt: new Date().toISOString(),
          message: 'ESP32 Car đã mất kết nối'
        });
      });

      ws.on('error', (error) => {
        console.error(`🤖❌ ESP32 WebSocket error (${clientId}):`, error);
        this.broadcastToFlutter('esp32_error', {
          type: 'connection_error',
          error: error.message,
          clientId,
          message: 'Lỗi kết nối ESP32'
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

    console.log(`📨 Sending command to ESP32: ${action}`);

    this.esp32Clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(JSON.stringify(command));
          sent = true;
          sentCount++;
          console.log(`✅ Command sent to ESP32 (${clientId}): ${action}`);
        } catch (error) {
          console.error(`❌ Error sending command to ESP32 (${clientId}):`, error);
        }
      } else {
        console.warn(`⚠️ ESP32 (${clientId}) not ready - ReadyState: ${client.socket.readyState}`);
      }
    });

    if (sentCount === 0) {
      console.warn('⚠️ No ESP32 clients connected to receive command');
    } else {
      console.log(`✅ Command sent to ${sentCount} ESP32 client(s)`);
    }

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

  startSensorDataBroadcast() {
    if (this.sensorInterval) clearInterval(this.sensorInterval);

    this.sensorInterval = setInterval(() => {
      if (this.connectedClients.size > 0) {
        const status = this.getESP32Status();
        this.broadcastToFlutter('esp32_status', status);

        if (Date.now() % 30000 < 3000) {
          this.sendCommandToESP32('get_battery');
        }
      }
    }, 3000);
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

  getHealthStatus() {
    return {
      websocketService: {
        initialized: this.isInitialized,
        socketIOClients: this.connectedClients.size,
        esp32Clients: this.esp32Clients.size,
        wsServerPort: this.wss?.options?.port || 'not started',
        uptime: process.uptime()
      },
      esp32Status: this.getESP32Status(),
      batteryStatus: this.getBatteryStatus(),
      networkInfo: {
        serverHost: '0.0.0.0',
        hotspotIP: '172.20.10.2',
        socketIOPort: 3000,
        webSocketPort: 3001
      },
      lastUpdate: new Date().toISOString()
    };
  }

  pingESP32Clients() {
    const pingMessage = {
      type: 'ping',
      timestamp: Date.now()
    };

    let activeClients = 0;
    this.esp32Clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        try {
          client.socket.send(JSON.stringify(pingMessage));
          activeClients++;
        } catch (error) {
          console.error(`❌ Failed to ping ESP32 (${clientId}):`, error);
        }
      }
    });

    console.log(`🏓 Pinged ${activeClients} ESP32 client(s)`);
    return activeClients;
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
