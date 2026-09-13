const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide product slug'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'Please provide product SKU'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Please select a product category'],
      enum: [
        'pharmaceuticals',
        'vaccines',
        'supplements',
        'farm_equipment',
        'diagnostic_kits',
        'clinical_supplies',
        'other',
      ],
      default: 'pharmaceuticals',
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0, 'Price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'KES',
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        altText: { type: String, default: '' },
      },
    ],
    stockQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    paymentMethods: [
      {
        type: String,
        enum: ['cash', 'mpesa', 'bank_transfer', 'card'],
        default: ['cash', 'mpesa'],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ isActive: 1, category: 1, sortOrder: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
