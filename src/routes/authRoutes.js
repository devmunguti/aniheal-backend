const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateBody } = require('../middleware/validationMiddleware');

// Email OTP Authentication
router.post('/send-otp', validateBody(['email']), authController.sendOtp);
router.post('/verify-otp', validateBody(['email', 'otp']), authController.verifyOtp);

// Legacy / Direct login & registration
router.post('/login', validateBody(['email', 'password']), authController.login);
router.post('/register', validateBody(['name', 'email', 'password']), authController.register);

// Profile, session & security
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, validateBody(['newPassword']), authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
