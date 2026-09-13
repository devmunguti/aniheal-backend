const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    altText: {
      type: String,
      default: '',
    },
    publicId: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'cloudinary',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Media', mediaSchema);
