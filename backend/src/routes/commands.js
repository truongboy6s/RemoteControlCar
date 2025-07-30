const express = require('express');
const router = express.Router();
const commandController = require('../controllers/commandController');
const { authenticateToken, checkAccess } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// All routes require authentication
router.use(authenticateToken);

// User routes (require access)
router.post('/send', checkAccess, commandController.sendCommand);
router.post('/emergency-stop', commandController.emergencyStop); // No access check for emergency

// History routes
router.get('/history', commandController.getCommandHistory);

// ESP32 routes (no authentication required for ESP32)
router.get('/latest', commandController.getLatestCommand);
router.post('/executed', commandController.markCommandExecuted);

// Admin routes
router.get('/stats', requireAdmin, commandController.getCommandStats);

module.exports = router;
