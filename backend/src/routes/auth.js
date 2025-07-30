const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(authenticateToken); // All routes below require authentication

router.post('/change-password', authController.changePassword);
router.get('/profile', authController.getProfile);
router.post('/logout', authController.logout);

module.exports = router;
