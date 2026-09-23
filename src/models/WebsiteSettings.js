const mongoose = require('mongoose');

const websiteSettingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: 'AniHeal Veterinary Solutions',
      trim: true,
    },
    tagline: {
      type: String,
      default: 'Veterinary Solutions',
    },
    licenseNumber: {
      type: String,
      default: 'KVB/PR/2025/0842',
    },
    licenseDescription: {
      type: String,
      default: 'Regulated Veterinary Practice License No. KVB/PR/2025/0842. Authorized for Mobile & Ambulatory Field Procedures, Clinical Diagnostics, and Veterinary Pharmacy.',
    },
    primaryPhone: {
      type: String,
      default: '+254 700 264 432',
    },
    hotlinePhone: {
      type: String,
      default: '+254 700 ANIHEAL',
    },
    emergencyPhone: {
      type: String,
      default: '+254 700 264 432',
    },
    primaryEmail: {
      type: String,
      default: 'clinical@aniheal.co.ke',
    },
    infoEmail: {
      type: String,
      default: 'info@aniheal.co.ke',
    },
    careersEmail: {
      type: String,
      default: 'careers@aniheal.co.ke',
    },
    mpesaTill: {
      type: String,
      default: '894022',
    },
    mpesaTillName: {
      type: String,
      default: 'AniHeal Agro-Vet Ltd',
    },
    whatsappNumber: {
      type: String,
      default: '254700264432',
    },
    headquartersAddress: {
      type: String,
      default: 'Veterinary Complex, Kabete Rd, Nairobi, Kenya',
    },
    regionalHubsSummary: {
      type: String,
      default: 'Nakuru • Eldoret • Nyeri • Kilifi',
    },
    socialLinks: {
      facebook: { type: String, default: '#' },
      twitter: { type: String, default: '#' },
      instagram: { type: String, default: '#' },
      linkedin: { type: String, default: '#' },
      youtube: { type: String, default: '#' },
      tiktok: { type: String, default: '#' },
      whatsapp: { type: String, default: 'https://wa.me/254700264432' },
    },
    operatingHours: {
      weekday: { type: String, default: 'Mon–Sat 07:00–18:00' },
      emergency: { type: String, default: '24/7 Emergency Response' },
    },
    notificationEmails: {
      triageAlertEmail: {
        type: String,
        default: 'hello.aniheal@gmail.com',
        trim: true,
      },
      orderAlertEmail: {
        type: String,
        default: 'hello.aniheal@gmail.com',
        trim: true,
      },
      insuranceAlertEmail: {
        type: String,
        default: 'hello.aniheal@gmail.com',
        trim: true,
      },
    },
    metaTitle: {
      type: String,
      default: 'AniHeal Veterinary Solutions | KVB Accredited',
    },
    metaDescription: {
      type: String,
      default: 'Accredited agro-veterinary enterprise advancing clinical diagnostics, preventative medicine, and precision livestock production across Kenya under One Health.',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
