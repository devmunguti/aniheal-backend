const mongoose = require('mongoose');

const vetLogSchema = new mongoose.Schema(
  {
    vetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vetName: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      index: true,
    },
    farmerName: {
      type: String,
      required: [true, 'Farmer/Owner name is required'],
      trim: true,
    },
    farmerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    farmLocation: {
      type: String,
      default: '',
      trim: true,
    },
    county: {
      type: String,
      default: '',
      trim: true,
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      index: true,
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
      index: true,
    },
    species: {
      type: String,
      required: true,
      default: 'dairy_cattle',
    },
    clinicalRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalRecord',
    },
    logDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    symptoms: {
      type: String,
      default: '',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    proceduresPerformed: [
      {
        type: String,
        trim: true,
      },
    ],
    medicationsAdministered: [
      {
        drugName: String,
        dosage: String,
        route: String,
        withdrawalPeriodDays: Number,
      },
    ],
    labSamplesTaken: {
      type: String,
      default: '',
    },
    clinicalNotes: {
      type: String,
      default: '',
    },
    feeCharged: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['paid_cash', 'paid_mpesa', 'billed_to_insurance', 'unpaid', 'waived'],
      default: 'paid_cash',
    },
    followUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

vetLogSchema.index({ logDate: -1, vetUser: 1 });

module.exports = mongoose.model('VetLog', vetLogSchema);
