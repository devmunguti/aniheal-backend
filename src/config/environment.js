const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aniheal',
  jwtSecret: process.env.JWT_SECRET || 'aniheal_jwt_default_secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    isConfigured: !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },
};

// Validate production secrets
if (config.isProduction) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'aniheal_jwt_default_secret') {
    console.warn('[SECURITY WARNING] Using default JWT_SECRET in production! Please set a strong JWT_SECRET in .env');
  }
  if (!process.env.MONGODB_URI) {
    console.warn('[CONFIG WARNING] MONGODB_URI not set. Falling back to default localhost connection.');
  }
}

module.exports = config;
