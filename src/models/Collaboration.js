const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Commenter name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: 2000,
    },
    approved: {
      type: Boolean,
      default: true,
    },
    isStaff: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const collaborationSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      required: [true, 'Collaboration header/title is required'],
      trim: true,
      maxlength: 250,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    partnerName: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    partnerLogo: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'One Health Research',
        'Community Outreach',
        'Academic & Training',
        'Livestock & Dairy Sector',
        'Veterinary Pharmaceuticals',
        'Wildlife & Conservation',
        'General Partnership',
      ],
      default: 'General Partnership',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=1200&q=80',
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: [true, 'Collaboration content / article body is required'],
    },
    externalUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'published',
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    comments: [commentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug before saving
collaborationSchema.pre('save', function () {
  if (this.isModified('header') && !this.slug) {
    this.slug = this.header
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
});

collaborationSchema.index({ status: 1, publishedAt: -1 });
collaborationSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Collaboration', collaborationSchema);
