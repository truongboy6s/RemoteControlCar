require('dotenv').config();
const http = require('http');
const { app, initializeApp, initializeWebSocket } = require('./app');
const ipDiscoveryService = require('./src/services/ipDiscoveryService');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize application
const startServer = async () => {
  try {
    // Initialize database and create default admin
    await initializeApp();

    // Initialize WebSocket service
    initializeWebSocket(server);

    // Start IP monitoring
    ipDiscoveryService.startMonitoring(10000); // Check every 10 seconds

    // Start server - Listen on all interfaces for hotspot access
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`
🚀 Car Control Backend Server Started!
📍 Server running on port ${PORT}
🌐 Local Access: http://localhost:${PORT}/api
� Hotspot Access: http://172.20.10.2:${PORT}/api
�🔌 WebSocket Local: ws://localhost:${PORT}
� WebSocket Hotspot: ws://172.20.10.2:${PORT}
�📊 Health Check: http://172.20.10.2:${PORT}
🗄️  Database: Connected to MongoDB
⚡ WebSocket: Ready for real-time communication

📋 Available Endpoints:
   🔐 Auth: /api/auth
   👥 Users: /api/users
   🎮 Commands: /api/commands  
   📝 Logs: /api/logs
   🤖 ESP32: /api/esp32

🛡️  Default Admin Account:
   📧 Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@carcontrol.com'}
   🔑 Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123456'}

🌐 Network Configuration:
   📡 Server Host: 0.0.0.0 (All interfaces)
   📱 Hotspot IP: 172.20.10.2
   🔌 WebSocket ESP32: ws://172.20.10.2:3001
   📊 Socket.IO Flutter: ws://172.20.10.2:3000
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
