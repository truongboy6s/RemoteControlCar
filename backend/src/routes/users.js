const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, canModifyUser } = require('../middleware/admin');

// All routes require authentication
router.use(authenticateToken);

// Admin only routes
router.get('/', requireAdmin, userController.getAllUsers);
router.post('/', requireAdmin, userController.createUser);
router.post('/grant-access', requireAdmin, userController.grantAccess);
router.post('/change-role', requireAdmin, userController.changeRole);
router.get('/stats', requireAdmin, userController.getUserStats);

// Admin or self routes
router.get('/:id', canModifyUser, userController.getUserById);
router.put('/:id', canModifyUser, userController.updateUser);

// Admin only - delete user
router.delete('/:id', requireAdmin, userController.deleteUser);

module.exports = router;
