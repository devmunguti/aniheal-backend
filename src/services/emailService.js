const logger = require('../utils/logger');

const emailService = {
  sendWelcomeEmail: async (email, name) => {
    logger.info(`Sending welcome email to ${email} (${name})`);
    return true;
  },
  sendOrderConfirmation: async (email, orderId) => {
    logger.info(`Sending order confirmation for order #${orderId} to ${email}`);
    return true;
  },
};

module.exports = emailService;
