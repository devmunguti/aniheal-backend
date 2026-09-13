const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Please provide FAQ question'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Please provide FAQ answer'],
    },
    category: {
      type: String,
      default: 'general',
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

faqSchema.index({ isPublished: 1, sortOrder: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
