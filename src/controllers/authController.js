const { sendSuccess } = require('../utils/response');
const authService = require('../services/authService');
const { logAction } = require('../services/auditService');
const emailService = require('../services/emailService');

/**
 * Step 1: Send OTP to User Email via Resend
 */
const sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.sendOtp(email);
    return sendSuccess(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

/**
 * Step 2: Verify OTP and Authenticate User
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyOtp(email, otp);

    await logAction({
      req: { user: result.user, headers: req.headers, socket: req.socket },
      action: 'ADMIN_OTP_LOGIN',
      resource: 'auth',
      details: { email: result.user.email, role: result.user.role },
    });

    return sendSuccess(res, result, 'Verification successful. Welcome back!');
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    await logAction({
      req: {
        user: result.user || { email: result.email || email, role: 'unverified' },
        headers: req.headers,
        socket: req.socket,
      },
      action: 'ADMIN_LOGIN_STEP1',
      resource: 'auth',
      details: { email: result.email || email, requireOtp: result.requireOtp },
    });

    return sendSuccess(res, result, result.message || 'Login step 1 successful');
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    return sendSuccess(res, user, 'Current user profile');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAction({
        req,
        action: 'ADMIN_LOGOUT',
        resource: 'auth',
      });
    }
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user._id, currentPassword, newPassword);

    await logAction({
      req,
      action: 'USER_PASSWORD_CHANGE',
      resource: 'auth',
      details: { email: req.user.email },
    });

    // Send security notification email (non-blocking)
    if (req.user?.email) {
      emailService
        .sendPasswordChangedEmail({
          to: req.user.email,
          name: req.user.name,
          email: req.user.email,
        })
        .catch((err) => console.error('[EMAIL ERROR] sendPasswordChangedEmail:', err.message));
    }

    return sendSuccess(res, result, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  login,
  changePassword,
  register,
  getMe,
  logout,
};
