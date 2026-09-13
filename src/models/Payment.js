const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductOrder',
    },
    policy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePolicy',
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'KES',
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: ['cash', 'mpesa', 'bank_transfer', 'card'],
      index: true,
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ['pending', 'partial', 'paid', 'failed', 'cancelled', 'refunded'],
      default: 'paid',
      index: true,
    },
    referenceNumber: {
      type: String,
      required: [true, 'Reference/Receipt number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: '',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    provider: {
      type: String,
      default: 'Manual/Internal',
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
