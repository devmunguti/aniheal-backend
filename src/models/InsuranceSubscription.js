const mongoose = require('mongoose');

const insuranceSubscriptionSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    applicantName: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true,
    },
    applicantPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    applicantEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    county: {
      type: String,
      required: [true, 'County is required'],
      trim: true,
    },
    farmLocation: {
      type: String,
      default: '',
      trim: true,
    },
    species: {
      type: String,
      required: [true, 'Species is required'],
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
      index: true,
    },
    animalCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    animalName: {
      type: String,
      default: '',
      trim: true,
    },
    tagOrChipId: {
      type: String,
      default: '',
      trim: true,
    },
    breed: {
      type: String,
      default: '',
      trim: true,
    },
    age: {
      type: String,
      default: '',
    },
    insurancePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePlan',
      required: [true, 'Insurance plan is required'],
    },
    preferredBilling: {
      type: String,
      default: 'monthly',
      enum: ['monthly', 'annual'],
    },
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'converted', 'cancelled'],
      default: 'submitted',
      index: true,
    },
    convertedPolicy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsurancePolicy',
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

insuranceSubscriptionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('InsuranceSubscription', insuranceSubscriptionSchema);
