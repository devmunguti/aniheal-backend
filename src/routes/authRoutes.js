const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validationMiddleware');

router.post('/login', validateBody(['email', 'password']), authController.login);
router.post('/register', validateBody(['name', 'email', 'password']), authController.register);
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
