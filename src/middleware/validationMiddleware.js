const { sendError } = require('../utils/response');

const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter((field) => !req.body || req.body[field] === undefined);
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 400);
    }
    next();
  };
};

module.exports = {
  validateBody,
};
