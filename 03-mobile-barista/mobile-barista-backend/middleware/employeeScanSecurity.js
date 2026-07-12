const { checkEmployeeLimits, detectAbuse, config } = require('./securityMiddleware');
const employeeScanBlock = require('../services/employeeScanBlockService');

const DEFAULT_ABUSE_MESSAGE =
  'Your scanner has been paused due to suspicious activity. A manager or owner must unlock it before you can scan again.';

function sendAbuseBlocked(res, message) {
  return res.status(429).json({
    error: message || DEFAULT_ABUSE_MESSAGE,
    code: 'ABUSE_DETECTED',
    requiresSupervisorUnlock: true,
  });
}

async function enforceEmployeeScanSecurity(employeeId, customerId, res) {
  if (!employeeId) return true;

  if (employeeScanBlock.isEmployeeScanBlocked(employeeId)) {
    sendAbuseBlocked(res);
    return false;
  }

  try {
    checkEmployeeLimits(employeeId);
  } catch (securityError) {
    res.status(429).json({
      error: securityError.message,
      code: 'RATE_LIMIT_EXCEEDED',
      maxScansPerDay: config.customerMaxScansPerDay,
      maxPointsPerDay: config.customerMaxPointsPerDay,
    });
    return false;
  }

  const abuse = detectAbuse(employeeId, customerId);
  if (abuse) {
    await employeeScanBlock.blockEmployeeScan(employeeId, abuse.abuseType, abuse.message);
    sendAbuseBlocked(res, abuse.message);
    return false;
  }

  return true;
}

module.exports = {
  enforceEmployeeScanSecurity,
  DEFAULT_ABUSE_MESSAGE,
};
