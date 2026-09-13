const mongoose = require('mongoose');

const hubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stationType: {
      type: String,
      enum: ['headquarters', 'hub', 'station', 'outpost'],
      default: 'hub',
    },
    subtitle: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: '+254 700 ANIHEAL',
    },
    leadOfficer: {
      type: String,
      default: '',
    },
    coverageAreas: [
      {
        type: String,
      },
    ],
    responseRadiusKm: {
      type: Number,
      default: 100,
    },
    fleetEquipment: [
      {
        type: String,
      },
    ],
    zone: {
      type: String,
      default: '',
    },
    zoneDescription: {
      type: String,
      default: '',
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

hubSchema.index({ isPublished: 1, sortOrder: 1 });

module.exports = mongoose.model('Hub', hubSchema);
