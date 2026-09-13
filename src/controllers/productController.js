const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const { sendSuccess, sendError } = require('../utils/response');
const { logAction } = require('../services/auditService');

// --- PUBLIC ENDPOINTS ---

const getAllProducts = async (req, res, next) => {
  try {
    const { category, search, inStock, sort = 'sortOrder' } = req.query;
    const query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }
    if (inStock === 'true') {
      query.stockQuantity = { $gt: 0 };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { sortOrder: 1, createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'name') sortOption = { name: 1 };

    const products = await Product.find(query).sort(sortOption);
    return sendSuccess(res, products, 'Products retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug.toLowerCase() });
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    return sendSuccess(res, product, 'Product retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// --- ADMIN ENDPOINTS ---

const getAllProductsAdmin = async (req, res, next) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category && category !== 'all') {
      query.category = category;
    }
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return sendSuccess(
      res,
      { products, total, page: Number(page), pages: Math.ceil(total / limit) },
      'Admin products retrieved'
    );
  } catch (err) {
    next(err);
  }
};

const getProductByIdAdmin = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }
    return sendSuccess(res, product, 'Product details retrieved');
  } catch (err) {
    next(err);
  }
};

const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      sku,
      category,
      description,
      features,
      price,
      currency = 'KES',
      images,
      stockQuantity = 0,
      lowStockThreshold = 5,
      isActive = true,
      paymentMethods = ['cash', 'mpesa'],
      sortOrder = 0,
    } = req.body;

    if (!name || !sku || price === undefined || !description) {
      return sendError(res, 'Name, SKU, price, and description are required', 400);
    }

    const generatedSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const existingSlug = await Product.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return sendError(res, 'Product with this slug/name already exists', 409);
    }

    const existingSKU = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSKU) {
      return sendError(res, 'Product with this SKU already exists', 409);
    }

    const product = await Product.create({
      name: name.trim(),
      slug: generatedSlug,
      sku: sku.toUpperCase().trim(),
      category: category || 'pharmaceuticals',
      description,
      features: Array.isArray(features) ? features : [],
      price: Number(price),
      currency,
      images: Array.isArray(images) ? images : [],
      stockQuantity: Math.max(0, Number(stockQuantity)),
      lowStockThreshold: Number(lowStockThreshold),
      isActive: Boolean(isActive),
      paymentMethods,
      sortOrder: Number(sortOrder),
      createdBy: req.user?._id,
    });

    if (stockQuantity > 0) {
      await InventoryTransaction.create({
        product: product._id,
        transactionType: 'purchase',
        quantity: Number(stockQuantity),
        previousQuantity: 0,
        newQuantity: Number(stockQuantity),
        reason: 'Initial stock intake',
        performedBy: req.user?._id,
      });
    }

    await logAction({
      req,
      action: 'PRODUCT_CREATED',
      resource: 'products',
      resourceId: product._id,
      details: { name: product.name, sku: product.sku, price: product.price },
    });

    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    const {
      name,
      slug,
      sku,
      category,
      description,
      features,
      price,
      currency,
      images,
      stockQuantity,
      lowStockThreshold,
      isActive,
      paymentMethods,
      sortOrder,
    } = req.body;

    if (sku && sku.toUpperCase().trim() !== product.sku) {
      const existingSKU = await Product.findOne({
        sku: sku.toUpperCase().trim(),
        _id: { $ne: product._id },
      });
      if (existingSKU) {
        return sendError(res, 'Another product with this SKU already exists', 409);
      }
      product.sku = sku.toUpperCase().trim();
    }

    if (name) product.name = name.trim();
    if (slug) product.slug = slug.toLowerCase().trim();
    if (category) product.category = category;
    if (description) product.description = description;
    if (features !== undefined) product.features = Array.isArray(features) ? features : [];
    if (price !== undefined) product.price = Number(price);
    if (currency) product.currency = currency;
    if (images !== undefined) product.images = Array.isArray(images) ? images : [];
    if (lowStockThreshold !== undefined) product.lowStockThreshold = Number(lowStockThreshold);
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (paymentMethods !== undefined) product.paymentMethods = paymentMethods;
    if (sortOrder !== undefined) product.sortOrder = Number(sortOrder);
    product.updatedBy = req.user?._id;

    // Track stock change if provided
    if (stockQuantity !== undefined && Number(stockQuantity) !== product.stockQuantity) {
      const oldQty = product.stockQuantity;
      const newQty = Math.max(0, Number(stockQuantity));
      product.stockQuantity = newQty;

      await InventoryTransaction.create({
        product: product._id,
        transactionType: 'adjustment',
        quantity: newQty - oldQty,
        previousQuantity: oldQty,
        newQuantity: newQty,
        reason: 'Manual stock adjustment in product editor',
        performedBy: req.user?._id,
      });
    }

    await product.save();

    await logAction({
      req,
      action: 'PRODUCT_UPDATED',
      resource: 'products',
      resourceId: product._id,
      details: { name: product.name, sku: product.sku, price: product.price },
    });

    return sendSuccess(res, product, 'Product updated successfully');
  } catch (err) {
    next(err);
  }
};

const toggleProductStatus = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    product.isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !product.isActive;
    await product.save();

    await logAction({
      req,
      action: 'PRODUCT_STATUS_CHANGED',
      resource: 'products',
      resourceId: product._id,
      details: { name: product.name, isActive: product.isActive },
    });

    return sendSuccess(res, product, `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (err) {
    next(err);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return sendError(res, 'Product not found', 404);
    }

    await logAction({
      req,
      action: 'PRODUCT_DELETED',
      resource: 'products',
      resourceId: req.params.id,
      details: { name: product.name, sku: product.sku },
    });

    return sendSuccess(res, { id: req.params.id }, 'Product deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProducts,
  getProductBySlug,
  getAllProductsAdmin,
  getProductByIdAdmin,
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
};
