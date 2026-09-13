const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema(
  {
    policyNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: true,
      index: true,
    },
    insurancePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePlan',
      required: true,
    },
    premium: {
      type: Number,
      required: true,
      min: [0, 'Premium cannot be negative'],
    },
    billingPeriod: {
      type: String,
      default: 'monthly',
      enum: ['monthly', 'quarterly', 'annual'],
    },
    coverageLimit: {
      type: Number,
      required: true,
    },
    deductible: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    enrollmentSource: {
      type: String,
      default: 'direct',
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

insurancePolicySchema.index({ animal: 1, status: 1 });
insurancePolicySchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
