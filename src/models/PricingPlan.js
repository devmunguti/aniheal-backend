const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Farm Plan',
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'KES',
    },
    billingPeriod: {
      type: String,
      default: '/ month',
    },
    billingNote: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    features: [
      {
        type: String,
      },
    ],
    isPopular: {
      type: Boolean,
      default: false,
    },
    ctaText: {
      type: String,
      default: 'Subscribe to Plan',
    },
    ctaLink: {
      type: String,
      default: '/appointment-booking',
    },
    isEmergency: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

pricingPlanSchema.index({ isPublished: 1, sortOrder: 1 });

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);
