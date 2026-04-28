const MOBILE_USER_AGENT_REGEX = /iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|Mobile/i;
const TABLET_USER_AGENT_REGEX = /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T|Tab/i;

const isLikelyMobileRequest = (req) => {
  const userAgent = req.get('user-agent') || '';
  const secChUaMobile = req.get('sec-ch-ua-mobile');
  const mobileContextHeader = req.get('x-admin-mobile-context');
  const deviceTypeHeader = req.get('x-admin-device-type');

  if (deviceTypeHeader === 'tablet') {
    return false;
  }

  if (deviceTypeHeader === 'mobile' || mobileContextHeader === 'mobile') {
    return true;
  }

  const tabletFromUserAgent = TABLET_USER_AGENT_REGEX.test(userAgent) || /Android(?!.*Mobile)/i.test(userAgent);
  if (tabletFromUserAgent) {
    return false;
  }

  const mobileFromUserAgent = MOBILE_USER_AGENT_REGEX.test(userAgent) || /Android.*Mobile/i.test(userAgent);
  const mobileFromClientHints = secChUaMobile === '?1';

  return mobileFromUserAgent || mobileFromClientHints;
};

const restrictAdminMobileAccess = (req, res, next) => {
  if (!isLikelyMobileRequest(req)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Admin access is only available on desktop or laptop devices.'
  });
};

module.exports = {
  isLikelyMobileRequest,
  restrictAdminMobileAccess
};
