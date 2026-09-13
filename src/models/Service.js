const mongoose = require('mongoose');

const featureItemSchema = new mongoose.Schema(
  {
    icon: { type: String, default: 'check_circle' },
    title: { type: String, required: true },
    desc: { type: String, default: '' },
  },
  { _id: false }
);

const serviceFAQSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide a service title'],
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: function () {
        return this.title;
      },
    },
    protocolNumber: {
      type: String,
      default: 'ANH-PROT-01',
    },
    badgeText: {
      type: String,
      default: 'Clinical Service',
    },
    badgeIcon: {
      type: String,
      default: 'biotech',
    },
    statusTag: {
      type: String,
      default: 'KVB Accredited',
    },
    category: [
      {
        type: String,
        enum: ['one-health', 'therapeutic', 'reproductive', 'insurance', 'diagnostics', 'surgery', 'preventative'],
      },
    ],
    image: {
      type: String,
      default: '',
    },
    heroImage: {
      type: String,
      default: '',
    },
    shortDescription: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Please provide a service description'],
    },
    features: [featureItemSchema],
    procedures: [
      {
        stepNumber: Number,
        title: String,
        description: String,
      },
    ],
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    preparation: {
      type: String,
      default: '',
    },
    pricingGuidelines: {
      type: String,
      default: '',
    },
    compliance: {
      type: String,
      default: 'Kenya Veterinary Board Standard Compliance',
    },
    specialists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember',
      },
    ],
    relatedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    faq: [serviceFAQSchema],
    bookingCTA: {
      type: String,
      default: 'Schedule Clinical Triage',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    seoTitle: {
      type: String,
      default: '',
    },
    seoDescription: {
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

serviceSchema.index({ isPublished: 1, sortOrder: 1 });

module.exports = mongoose.model('Service', serviceSchema);
