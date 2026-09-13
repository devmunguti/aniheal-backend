const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Owner/Farmer name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    county: {
      type: String,
      required: [true, 'County is required'],
      trim: true,
      index: true,
    },
    subCounty: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    farmName: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
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

ownerSchema.index({ name: 'text', farmName: 'text', phone: 'text' });

module.exports = mongoose.model('Owner', ownerSchema);
