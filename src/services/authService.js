const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/environment');

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
  login: async (email, password) => {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
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

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user);
    const userObj = user.toObject();
    delete userObj.password;

    return { token, user: userObj };
  },

  register: async (userData) => {
    const existing = await User.findOne({ email: userData.email.toLowerCase() });
    if (existing) {
      const error = new Error('A user with this email address already exists');
      error.statusCode = 400;
      throw error;
    }

    // Strictly enforce 'user' role for public self-registration.
    // Privileged accounts (superadmin, editor) can ONLY be created by authenticated SuperAdmins via /api/admin/users
    const sanitizedData = {
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: userData.password,
      role: 'user',
      isActive: true,
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
