const Payment = require('../models/Payment');
const ProductOrder = require('../models/ProductOrder');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const generateReceiptNumber = () => {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RCP-${new Date().getFullYear()}-${rand}`;
};

const recordPayment = async (req, res, next) => {
  try {
    const {
      orderId,
      policyId,
      amount,
      paymentMethod,
      referenceNumber,
      customerName,
      customerPhone,
      provider = 'Manual/Internal',
      notes,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return sendError(res, 'Payment amount must be greater than 0', 400);
    }

    if (!paymentMethod) {
      return sendError(res, 'Payment method is required (cash, mpesa, bank_transfer, card)', 400);
    }

    const refNo = (referenceNumber || generateReceiptNumber()).trim().toUpperCase();

    // Check for unique reference number
    const existingPayment = await Payment.findOne({ referenceNumber: refNo });
    if (existingPayment) {
      return sendError(res, `A transaction with reference number '${refNo}' already exists`, 409);
    }

    let linkedOrder = null;
    if (orderId) {
      linkedOrder = await ProductOrder.findById(orderId);
      if (linkedOrder) {
        linkedOrder.paymentStatus = 'paid';
        await linkedOrder.save();
      }
    }

    const payment = await Payment.create({
      order: orderId || undefined,
      policy: policyId || undefined,
      amount: Number(amount),
      currency: 'KES',
      paymentMethod,
      paymentStatus: 'paid',
      referenceNumber: refNo,
      customerName: customerName || linkedOrder?.customerName || '',
      customerPhone: customerPhone || linkedOrder?.customerPhone || '',
      provider,
      transactionDate: new Date(),
      recordedBy: req.user?._id,
      notes: notes || '',
    });

    await logAction({
      req,
      action: 'PAYMENT_RECORDED',
      resource: 'payments',
      resourceId: payment._id,
      details: {
        referenceNumber: payment.referenceNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        customerName: payment.customerName,
      },
    });

    return sendSuccess(res, payment, 'Payment record saved successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const { paymentMethod, paymentStatus, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }
    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('order', 'orderNumber totalAmount orderStatus')
      .populate('recordedBy', 'name email')
      .sort({ transactionDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { payments, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Payments retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order')
      .populate('recordedBy', 'name email');
    if (!payment) {
      return sendError(res, 'Payment record not found', 404);
    }
    return sendSuccess(res, payment, 'Payment retrieved');
  } catch (err) {
    next(err);
  }
};

const getPaymentAnalytics = async (req, res, next) => {
  try {
    const [totalRevenueResult, paymentMethodBreakdown, recentTransactions] = await Promise.all([
      Payment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: '$paymentMethod', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Payment.find({ paymentStatus: 'paid' }).sort({ transactionDate: -1 }).limit(10),
    ]);

    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
    const totalTransactions = totalRevenueResult[0]?.count || 0;

    return sendSuccess(
      res,
      {
        totalRevenue,
        totalTransactions,
        paymentMethodBreakdown,
        recentTransactions,
      },
      'Payment analytics retrieved'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  recordPayment,
  getAllPayments,
  getPaymentById,
  getPaymentAnalytics,
};
