# Backend Development Guide

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js      # Authentication logic
│   │   ├── userController.js      # User management 
│   │   ├── commandController.js   # Car control commands
│   │   └── logController.js       # Activity logging
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Command.js            # Command schema
│   │   └── Log.js                # Log schema
│   ├── routes/
│   │   ├── auth.js               # Auth routes
│   │   ├── users.js              # User routes
│   │   ├── commands.js           # Command routes
│   │   └── logs.js               # Log routes
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   └── admin.js              # Admin role check
│   ├── services/
│   │   ├── esp32Service.js       # ESP32 communication
│   │   └── websocketService.js   # WebSocket handling
│   └── config/
│       ├── database.js           # MongoDB connection
│       └── constants.js          # App constants
├── package.json
├── app.js                        # Express app setup
└── server.js                     # Server entry point
```

## 📦 Dependencies

```json
{
  "name": "car-control-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "socket.io": "^4.7.4",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

## 🔧 Environment Variables (.env)

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://truongdodinh16:2k4truong@cluster0.n6ebrwu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Server Configuration  
PORT=3000
NODE_ENV=development

# ESP32 Configuration
ESP32_IP=192.168.1.100
ESP32_PORT=80
```

## 🚀 Quick Start Commands

```bash
# Initialize project
npm init -y

# Install dependencies
npm install express mongoose bcryptjs jsonwebtoken cors dotenv socket.io axios

# Install dev dependencies  
npm install --save-dev nodemon

# Add to package.json scripts:
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}

# Run development server
npm run dev
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/profile` - Get current user profile

### User Management (Admin Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/grant-access` - Grant/revoke access

### Commands
- `POST /api/commands/send` - Send control command to ESP32

### Logs
- `GET /api/logs` - Get activity logs (admin: all, user: personal)

## 🔌 ESP32 Integration

### HTTP Commands
```javascript
// Send command to ESP32
const sendToESP32 = async (action) => {
  try {
    const response = await axios.post(`http://${ESP32_IP}/command`, {
      action: action // 'forward', 'backward', 'left', 'right', 'stop'
    });
    return response.data;
  } catch (error) {
    console.error('ESP32 communication error:', error);
    throw error;
  }
};
```

### WebSocket for Sensor Data
```javascript
// Receive sensor data from ESP32
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Forward ESP32 sensor data to Flutter app
  socket.on('sensor_data', (data) => {
    socket.broadcast.emit('sensor_update', data);
  });
});
```

## 🛡️ Security Middleware

### JWT Authentication
```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};
```

### Admin Role Check
```javascript
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

## 📊 Database Schemas

### User Schema
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  hasAccess: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Command Schema
```javascript
const commandSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { 
    type: String, 
    enum: ['forward', 'backward', 'left', 'right', 'stop'], 
    required: true 
  },
  timestamp: { type: Date, default: Date.now },
  executed: { type: Boolean, default: false }
});
```

### Log Schema
```javascript
const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed }
});
```
