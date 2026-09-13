const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

const adjustStock = async (req, res, next) => {
  try {
    const { productId, adjustmentType, quantity, reason, notes } = req.body;

    if (!productId || !adjustmentType || quantity === undefined) {
      return sendError(res, 'Product ID, adjustment type, and quantity are required', 400);
    }

    const product = await Product.findById(productId);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    const qtyNumber = Number(quantity);
    if (isNaN(qtyNumber) || qtyNumber <= 0) {
      return sendError(res, 'Quantity must be a positive number', 400);
    }

    const previousQuantity = product.stockQuantity;
    let newQuantity = previousQuantity;

    if (adjustmentType === 'purchase' || adjustmentType === 'return' || adjustmentType === 'correction_add') {
      newQuantity = previousQuantity + qtyNumber;
    } else if (adjustmentType === 'damaged' || adjustmentType === 'expired' || adjustmentType === 'adjustment' || adjustmentType === 'correction_sub') {
      if (previousQuantity < qtyNumber) {
        return sendError(res, `Cannot reduce stock below 0. Current stock is ${previousQuantity}`, 400);
      }
      newQuantity = previousQuantity - qtyNumber;
    } else {
      return sendError(res, `Invalid adjustment type: ${adjustmentType}`, 400);
    }

    product.stockQuantity = newQuantity;
    await product.save();

    const transaction = await InventoryTransaction.create({
      product: product._id,
      transactionType: adjustmentType.startsWith('correction') ? 'correction' : adjustmentType,
      quantity: adjustmentType.includes('sub') || adjustmentType === 'damaged' || adjustmentType === 'expired' ? -qtyNumber : qtyNumber,
      previousQuantity,
      newQuantity,
      reason: reason || `Manual adjustment: ${adjustmentType}`,
      performedBy: req.user?._id,
      notes: notes || '',
    });

    await logAction({
      req,
      action: 'STOCK_ADJUSTED',
      resource: 'inventory',
      resourceId: transaction._id,
      details: {
        productName: product.name,
        previousQuantity,
        newQuantity,
        adjustmentType,
      },
    });

    return sendSuccess(res, { product, transaction }, 'Stock adjusted successfully');
  } catch (err) {
    next(err);
  }
};

const getInventoryHistory = async (req, res, next) => {
  try {
    const { productId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (productId) {
      query.product = productId;
    }

    const total = await InventoryTransaction.countDocuments(query);
    const transactions = await InventoryTransaction.find(query)
      .populate('product', 'name sku stockQuantity')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { transactions, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Inventory history retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getLowStockAlerts = async (req, res, next) => {
  try {
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
    }).sort({ stockQuantity: 1 });

    return sendSuccess(res, lowStockProducts, 'Low stock alerts retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  adjustStock,
  getInventoryHistory,
  getLowStockAlerts,
};
