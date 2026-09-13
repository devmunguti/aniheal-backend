const Order = require('../models/Order');

const orderService = {
  createOrder: async (orderData) => {
    return await Order.create({
      user: orderData.userId || orderData.user,
      items: orderData.items || [],
      totalAmount: Number(orderData.totalAmount) || 0,
      status: 'pending',
    });
  },
  getOrderById: async (id) => {
    return await Order.findById(id).populate('user', 'name email');
  },
  getUserOrders: async (userId) => {
    if (!userId) return [];
    return await Order.find({ user: userId }).sort({ createdAt: -1 });
  },
};

module.exports = orderService;
