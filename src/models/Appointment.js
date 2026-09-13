const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    ticketRef: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    farmerName: {
      type: String,
      required: true,
      trim: true,
    },
    farmName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    county: {
      type: String,
      required: true,
    },
    landmarks: {
      type: String,
      default: '',
    },
    gpsCoordinates: {
      type: String,
      default: '',
    },
    speciesType: {
      type: String,
      required: true,
    },
    totalHeadcount: {
      type: Number,
      default: 1,
    },
    affectedCount: {
      type: Number,
      default: 1,
    },
    clinicalService: {
      type: String,
      required: true,
    },
    dispatchTier: {
      type: String,
      enum: ['emergency', 'morning', 'afternoon', 'standard'],
      default: 'morning',
    },
    preferredDate: {
      type: String,
      default: '',
    },
    symptomsDescription: {
      type: String,
      required: true,
    },
    mediaUrls: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'contacted', 'dispatched', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    assignedOfficer: {
      type: String,
      default: 'Central Dispatch Desk',
    },
    clinicalNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
