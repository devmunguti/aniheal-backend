const mongoose = require('mongoose');

const contentBlockSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    section: {
      type: String,
      required: true,
      enum: ['homepage', 'services', 'team', 'contact', 'booking', 'global'],
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    subtitle: {
      type: String,
      default: '',
    },
    body: {
      type: String,
      default: '',
    },
    badge: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

module.exports = mongoose.model('ContentBlock', contentBlockSchema);
