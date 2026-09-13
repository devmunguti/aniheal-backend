const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    tagOrChipId: {
      type: String,
      required: [true, 'Tag / Microchip ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    animalName: {
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
    breed: {
      type: String,
      default: '',
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'castrated', 'spayed', 'unknown'],
      default: 'unknown',
    },
    dateOfBirth: {
      type: Date,
    },
    age: {
      type: String,
      default: '',
    },
    healthStatus: {
      type: String,
      enum: ['healthy', 'under_treatment', 'critical', 'deceased'],
      default: 'healthy',
      index: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

animalSchema.index({ owner: 1, species: 1 });

module.exports = mongoose.model('Animal', animalSchema);
