require('dotenv').config();
const http = require('http');
const { app, initializeApp, initializeWebSocket } = require('./app');

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

    // Start server
    server.listen(PORT, () => {
      console.log(`
🚀 Car Control Backend Server Started!
📍 Server running on port ${PORT}
🌐 API Base URL: http://localhost:${PORT}/api
🔌 WebSocket URL: ws://localhost:${PORT}
📊 Health Check: http://localhost:${PORT}
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
