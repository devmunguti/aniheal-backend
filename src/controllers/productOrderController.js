const ProductOrder = require('../models/ProductOrder');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const generateOrderNumber = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${new Date().getFullYear()}-${rand}`;
};

const createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      county,
      deliveryAddress,
      items,
      notes,
    } = req.body;

    if (!customerName || !customerPhone || !county) {
      return sendError(res, 'Customer name, phone number, and county are required', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Order must contain at least one item', 400);
    }

    // Validate products, check stock, and snapshot pricing
    const resolvedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product);
      if (!product) {
        return sendError(res, `Product not found: ${item.productId || item.name}`, 404);
      }
      if (!product.isActive) {
        return sendError(res, `Product ${product.name} is currently inactive and cannot be ordered`, 400);
      }

      const qty = Math.max(1, Number(item.quantity) || 1);
      const itemSubtotal = product.price * qty;

      resolvedItems.push({
        product: product._id,
        name: product.name,
        quantity: qty,
        unitPrice: product.price,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    const totalAmount = subtotal;
    const orderNumber = generateOrderNumber();

    const order = await ProductOrder.create({
      orderNumber,
      customer: req.user?._id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: (customerEmail || '').trim(),
      county: county.trim(),
      deliveryAddress: (deliveryAddress || '').trim(),
      items: resolvedItems,
      subtotal,
      totalAmount,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      notes: (notes || '').trim(),
      createdBy: req.user?._id,
    });

    await logAction({
      req,
      action: 'ORDER_CREATED',
      resource: 'orders',
      resourceId: order._id,
      details: {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
      },
    });

    return sendSuccess(res, order, 'Product order submitted successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getAllOrders = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (orderStatus && orderStatus !== 'all') {
      query.orderStatus = orderStatus;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await ProductOrder.countDocuments(query);
    const orders = await ProductOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { orders, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Orders retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const order = await ProductOrder.findById(req.params.id).populate('items.product', 'sku name category images');
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }
    return sendSuccess(res, order, 'Order retrieved');
  } catch (err) {
    next(err);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus, notes } = req.body;
    const order = await ProductOrder.findById(req.params.id);
    if (!order) {
      return sendError(res, 'Order not found', 404);
    }

    const previousStatus = order.orderStatus;

    if (orderStatus) {
      const allowedOrderStatuses = ['pending', 'processing', 'fulfilled', 'cancelled'];
      if (!allowedOrderStatuses.includes(orderStatus)) {
        return sendError(res, `Invalid order status: ${orderStatus}`, 400);
      }
      order.orderStatus = orderStatus;

      // When transitioning to fulfilled, adjust inventory for each item
      if (orderStatus === 'fulfilled' && previousStatus !== 'fulfilled') {
        for (const item of order.items) {
          const prod = await Product.findById(item.product);
          if (prod) {
            const oldQty = prod.stockQuantity;
            prod.stockQuantity = Math.max(0, oldQty - item.quantity);
            await prod.save();

            await InventoryTransaction.create({
              product: prod._id,
              transactionType: 'sale',
              quantity: -item.quantity,
              previousQuantity: oldQty,
              newQuantity: prod.stockQuantity,
              reason: `Order fulfilled: ${order.orderNumber}`,
              reference: order.orderNumber,
              performedBy: req.user?._id,
            });
          }
        }
      }
    }

    if (paymentStatus) {
      const allowedPaymentStatuses = ['pending', 'partial', 'paid', 'failed', 'refunded'];
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return sendError(res, `Invalid payment status: ${paymentStatus}`, 400);
      }
      order.paymentStatus = paymentStatus;
    }

    if (notes !== undefined) order.notes = notes;
    await order.save();

    await logAction({
      req,
      action: 'ORDER_STATUS_CHANGED',
      resource: 'orders',
      resourceId: order._id,
      details: {
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      },
    });

    return sendSuccess(res, order, 'Order status updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};
