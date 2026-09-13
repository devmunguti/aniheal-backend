const mongoose = require('mongoose');

const researchItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: {
      type: String,
      required: true,
    },
    journal: {
      type: String,
      default: '',
    },
    year: {
      type: Number,
      default: 2024,
    },
    tag: {
      type: String,
      default: 'Peer-Reviewed',
    },
    summary: {
      type: String,
      default: '',
    },
    externalUrl: {
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

module.exports = mongoose.model('ResearchItem', researchItemSchema);
