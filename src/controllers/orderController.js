const { sendSuccess, sendError } = require('../utils/response');
const orderService = require('../services/orderService');

const createOrder = async (req, res, next) => {
  try {
    const orderData = {
      ...req.body,
      userId: req.user?._id || req.body.userId,
    };
    const order = await orderService.createOrder(orderData);
    return sendSuccess(res, order, 'Order created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }
    return sendSuccess(res, order, 'Order retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const orders = await orderService.getUserOrders(req.user?._id || req.user?.id);
    return sendSuccess(res, orders, 'User orders retrieved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
};
