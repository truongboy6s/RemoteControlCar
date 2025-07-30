const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/database');
const webSocketService = require('./src/services/websocketService');

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const commandRoutes = require('./src/routes/commands');
const logRoutes = require('./src/routes/logs');
const esp32Routes = require('./src/routes/esp32');

// Import models for initialization
const User = require('./src/models/User');
const { ROLES } = require('./src/config/constants');

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'https://localhost:3000',
    'https://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.method === 'POST' && req.path.includes('/auth/login')) {
    console.log('Login request body:', req.body);
  }
  next();
});

// Add CORS headers manually for debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received for:', req.path);
    return res.status(200).end();
  }
  
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Car Control Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      commands: '/api/commands',
      logs: '/api/logs',
      esp32: '/api/esp32'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/esp32', esp32Routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Initialize database and create default admin
const initializeApp = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('Database connected successfully');

    // Create default admin user if not exists
    const adminExists = await User.findOne({ role: ROLES.ADMIN });
    if (!adminExists) {
      const defaultAdmin = new User({
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@carcontrol.com',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123456',
        name: process.env.DEFAULT_ADMIN_NAME || 'System Administrator',
        role: ROLES.ADMIN,
        hasAccess: true
      });

      await defaultAdmin.save();
      console.log('Default admin user created:', defaultAdmin.email);
    } else {
      console.log('Admin user already exists');
    }

  } catch (error) {
    console.error('App initialization error:', error);
    process.exit(1);
  }
};

// Initialize WebSocket service
const initializeWebSocket = (server) => {
  webSocketService.initialize(server);
};

module.exports = { app, initializeApp, initializeWebSocket };
