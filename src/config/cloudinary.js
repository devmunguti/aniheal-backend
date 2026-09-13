const cloudinary = require('cloudinary').v2;
const { cloudinary: config } = require('./environment');

if (config.isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
}

module.exports = cloudinary;
