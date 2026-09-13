const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: [
      {
        type: String,
        enum: ['leadership', 'field-surgery', 'one-health', 'theriogenology', 'diagnostics'],
      },
    ],
    roleTag: {
      type: String,
      default: 'Specialist',
    },
    specialtyTag: {
      type: String,
      default: 'Veterinary Medicine',
    },
    kvbLicense: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      default: 'Nairobi Central HQ',
    },
    experience: {
      type: String,
      default: '',
    },
    actionLabel: {
      type: String,
      default: 'Schedule Specialist Consult',
    },
    isDirector: {
      type: Boolean,
      default: false,
    },
    directorSpecialty: {
      type: String,
      default: '',
    },
    directorAccreditation: {
      type: String,
      default: '',
    },
    directorDutyHub: {
      type: String,
      default: '',
    },
    email: {
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

teamMemberSchema.index({ isPublished: 1, sortOrder: 1 });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
