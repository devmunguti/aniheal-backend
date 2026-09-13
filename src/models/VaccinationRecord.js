const mongoose = require('mongoose');

const vaccinationRecordSchema = new mongoose.Schema(
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
    },
    vaccineName: {
      type: String,
      required: [true, 'Vaccine name is required'],
      trim: true,
    },
    dateAdministered: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    nextDueDate: {
      type: Date,
      index: true,
    },
    batchNumber: {
      type: String,
      default: '',
      trim: true,
    },
    manufacturer: {
      type: String,
      default: '',
    },
    administeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    vetName: {
      type: String,
      default: '',
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

vaccinationRecordSchema.index({ animal: 1, dateAdministered: -1 });

module.exports = mongoose.model('VaccinationRecord', vaccinationRecordSchema);
