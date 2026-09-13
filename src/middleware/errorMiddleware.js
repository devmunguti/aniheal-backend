const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

const notFoundHandler = (req, res, next) => {
  return sendError(res, `Route not found - ${req.originalUrl}`, 404);
};

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
