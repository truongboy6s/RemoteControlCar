const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// All routes require authentication
router.use(authenticateToken);

// User routes - Only movement logs
router.get('/user', logController.getUserLogs); // Get current user's movement logs

// Admin routes - All logs with category filtering
router.get('/', requireAdmin, logController.getLogs); // Get all logs (legacy)
router.get('/category', requireAdmin, logController.getLogsByCategory); // Get logs by category
router.get('/stats', requireAdmin, logController.getLogStats); // Get log statistics with categories
router.post('/cleanup', requireAdmin, logController.deleteOldLogs);
router.get('/export', requireAdmin, logController.exportLogs);

module.exports = router;
