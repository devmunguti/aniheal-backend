const mongoose = require('mongoose');

const speciesPricingSchema = new mongoose.Schema(
  {
    species: {
      type: String,
      required: true,
      enum: [
        'dairy_cattle',
        'beef_cattle',
        'canine',
        'feline',
        'equine',
        'small_ruminants',
        'poultry',
        'other',
      ],
    },
    monthlyPremium: {
      type: Number,
      required: true,
      min: [0, 'Monthly premium cannot be negative'],
    },
    annualPremium: {
      type: Number,
      required: true,
      min: [0, 'Annual premium cannot be negative'],
    },
    coverageLimit: {
      type: Number,
      required: true,
      min: [0, 'Coverage limit cannot be negative'],
    },
    deductible: {
      type: Number,
      default: 0,
      min: [0, 'Deductible cannot be negative'],
    },
  },
  { _id: false }
);

const insurancePlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide plan name'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Please provide plan code'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide plan description'],
    },
    targetSpecies: [
      {
        type: String,
        enum: [
          'dairy_cattle',
          'beef_cattle',
          'canine',
          'feline',
          'equine',
          'small_ruminants',
          'poultry',
          'other',
        ],
      },
    ],
    speciesPricing: [speciesPricingSchema],
    coverageDetails: [
      {
        type: String,
        trim: true,
      },
    ],
    exclusions: [
      {
        type: String,
        trim: true,
      },
    ],
    waitingPeriodDays: {
      type: Number,
      default: 14,
    },
    basePrice: {
      type: Number,
      default: 0,
    },
    billingPeriod: {
      type: String,
      default: 'monthly',
      enum: ['monthly', 'quarterly', 'annual'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
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

insurancePlanSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('InsurancePlan', insurancePlanSchema);
