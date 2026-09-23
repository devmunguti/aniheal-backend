const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/environment');
const { sendOtpEmail } = require('./emailService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

const authService = {
  /**
   * Step 1: Validate Email + Password credentials, then dispatch 6-digit OTP via Resend
   */
  login: async (email, password) => {
    if (!email || !email.trim() || !password) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+password +otpCode +otpExpiresAt +otpAttempts');

    if (!user) {
      // Generic error message to prevent account enumeration
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated. Please contact an administrator.');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Generate 6-digit cryptographically secure numeric OTP
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiryMinutes = 10;
    const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    // Send OTP via Resend email service
    const emailResult = await sendOtpEmail({
      to: cleanEmail,
      name: user.name,
      otpCode,
      expiryMinutes,
    });

    return {
      requireOtp: true,
      email: cleanEmail,
      message: `Password confirmed. A 6-digit verification passcode has been sent to ${cleanEmail}`,
      expiresInMinutes: expiryMinutes,
      deliveryStatus: emailResult.deliveredVia,
    };
  },

  /**
   * Resend 6-digit OTP to user's email
   */
  sendOtp: async (email) => {
    if (!email || !email.trim()) {
      const error = new Error('Please provide a valid email address');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+otpCode +otpExpiresAt +otpAttempts');

    if (!user) {
      const error = new Error('No account found associated with this email address.');
      error.statusCode = 404;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('This account has been deactivated. Please contact an administrator.');
      error.statusCode = 403;
      throw error;
    }

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const expiryMinutes = 10;
    const otpExpiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    user.otpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const emailResult = await sendOtpEmail({
      to: cleanEmail,
      name: user.name,
      otpCode,
      expiryMinutes,
    });

    return {
      requireOtp: true,
      message: `A 6-digit verification passcode has been sent to ${cleanEmail}`,
      email: cleanEmail,
      expiresInMinutes: expiryMinutes,
      deliveryStatus: emailResult.deliveredVia,
    };
  },

  /**
   * Step 2: Verify the 6-digit OTP and issue JWT session token
   */
  verifyOtp: async (email, otp) => {
    if (!email || !otp) {
      const error = new Error('Email address and 6-digit passcode are required');
      error.statusCode = 400;
      throw error;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const user = await User.findOne({ email: cleanEmail }).select('+otpCode +otpExpiresAt +otpAttempts');
    if (!user) {
      const error = new Error('Invalid email or passcode');
      error.statusCode = 404;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated. Please contact an administrator.');
      error.statusCode = 403;
      throw error;
    }

    // Rate limiting: check attempts limit (max 5)
    if (user.otpAttempts >= 5) {
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      await user.save({ validateBeforeSave: false });
      const error = new Error('Too many failed attempts. Please request a new verification code.');
      error.statusCode = 429;
      throw error;
    }

    // Check if OTP exists and is not expired
    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      const error = new Error('Verification passcode has expired or was not requested. Please log in again.');
      error.statusCode = 400;
      throw error;
    }

    // Check code match
    if (user.otpCode !== cleanOtp) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      const remaining = 5 - user.otpAttempts;
      const error = new Error(`Invalid verification passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
      error.statusCode = 401;
      throw error;
    }

    // Success: Clear OTP fields and record last login
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.otpCode;
    delete userObj.otpExpiresAt;
    delete userObj.otpAttempts;

    return {
      token,
      user: userObj,
      mustChangePassword: !!user.mustChangePassword,
    };
  },

  /**
   * Change password (e.g. on first login or user profile update)
   */
  changePassword: async (userId, currentPassword, newPassword) => {
    if (!newPassword || newPassword.length < 8) {
      const error = new Error('New password must be at least 8 characters long');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      const error = new Error('User account not found');
      error.statusCode = 404;
      throw error;
    }

    // If currentPassword is provided and user is not in forced change mode with null check
    if (currentPassword) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 400;
        throw error;
      }
    }

    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.otpCode;
    delete userObj.otpExpiresAt;
    delete userObj.otpAttempts;

    return { user: userObj, message: 'Password updated successfully' };
  },

  register: async (userData) => {
    const existing = await User.findOne({ email: userData.email.toLowerCase() });
    if (existing) {
      const error = new Error('A user with this email address already exists');
      error.statusCode = 400;
      throw error;
    }

    const sanitizedData = {
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: userData.password || crypto.randomBytes(16).toString('hex'),
      role: 'user',
      isActive: true,
      mustChangePassword: false,
    };

    const user = await User.create(sanitizedData);
    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;

    return { token, user: userObj };
  },

  getMe: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  },
};

module.exports = authService;
