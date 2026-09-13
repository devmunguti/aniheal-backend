const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    drugName: { type: String, required: true },
    dosage: { type: String, required: true },
    route: { type: String, default: 'IM', enum: ['IM', 'IV', 'SC', 'Oral', 'Topical', 'Intramammary', 'Other'] },
    frequency: { type: String, default: 'Once daily' },
    duration: { type: String, default: '3 days' },
    withdrawalPeriodDays: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const clinicalRecordSchema = new mongoose.Schema(
  {
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
    vetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visitDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    chiefComplaint: {
      type: String,
      required: [true, 'Chief complaint is required'],
      trim: true,
    },
    symptoms: {
      type: String,
      default: '',
    },
    clinicalFindings: {
      type: String,
      default: '',
    },
    diagnosis: {
      type: String,
      required: [true, 'Diagnosis is required'],
      trim: true,
    },
    vitals: {
      temperature: { type: String, default: '' },
      heartRate: { type: String, default: '' },
      respirationRate: { type: String, default: '' },
      weightKg: { type: Number },
    },
    procedures: [
      {
        type: String,
        trim: true,
      },
    ],
    treatments: {
      type: String,
      default: '',
    },
    medications: [medicationSchema],
    labResults: {
      type: String,
      default: '',
    },
    clinicalNotes: {
      type: String,
      default: '',
    },
    followUpDate: {
      type: Date,
    },
    billingStatus: {
      type: String,
      enum: ['unbilled', 'billed_cash', 'billed_mpesa', 'covered_by_insurance', 'waived'],
      default: 'unbilled',
    },
    feeCharged: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

clinicalRecordSchema.index({ visitDate: -1 });

module.exports = mongoose.model('ClinicalRecord', clinicalRecordSchema);
