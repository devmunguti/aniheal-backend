const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, users, 'Users retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, user, 'User retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    const userObj = user.toObject();
    delete userObj.password;

    return sendSuccess(res, userObj, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, { id: req.params.id }, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
