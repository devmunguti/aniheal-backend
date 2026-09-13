const { sendSuccess } = require('../utils/response');
const authService = require('../services/authService');
const { logAction } = require('../services/auditService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    await logAction({
      req: { user: result.user, headers: req.headers, socket: req.socket },
      action: 'ADMIN_LOGIN',
      resource: 'auth',
      details: { email: result.user.email },
    });

    return sendSuccess(res, result, 'Login successful');
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

module.exports = {
  login,
  register,
  getMe,
  logout,
};
