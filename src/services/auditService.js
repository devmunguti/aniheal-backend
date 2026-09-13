const AuditLog = require('../models/AuditLog');

const logAction = async ({ req, action, resource, resourceId = '', details = {} }) => {
  try {
    const user = req?.user;
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    
    await AuditLog.create({
      user: user?._id || user?.id,
      userName: user?.name || 'Admin',
      userEmail: user?.email || 'admin@aniheal.co.ke',
      action,
      resource,
      resourceId: String(resourceId),
      details,
      ipAddress,
    });
  } catch (error) {
    console.error('Failed to log audit activity:', error.message);
  }
};

module.exports = {
  logAction,
};
