/** Phone UA only — bare "Mobile" matches iPad Safari (Mobile/15E148) and must be excluded. */
const MOBILE_USER_AGENT_REGEX = /iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;
const TABLET_USER_AGENT_REGEX = /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T|Tab/i;

/** Matches frontend ADMIN_TABLET_MIN_VIEWPORT — physical short edge below this is a phone. */
const PHONE_MAX_PHYSICAL_SHORT_EDGE = 600;

const isLikelyMobileRequest = (req) => {
  const userAgent = req.get('user-agent') || '';
  const secChUaMobile = req.get('sec-ch-ua-mobile');
  const mobileContextHeader = req.get('x-admin-mobile-context');
  const deviceTypeHeader = (req.get('x-admin-device-type') || '').toLowerCase();
  const physicalShortRaw = req.get('x-admin-physical-short');
  const physicalShort = Number.parseInt(physicalShortRaw, 10);

  if (deviceTypeHeader === 'tablet') {
    return false;
  }

  if (deviceTypeHeader === 'mobile' || mobileContextHeader === 'mobile') {
    return true;
  }

  // Client-reported physical screen (phones stay small in Android/iOS desktop-site mode).
  if (
    Number.isFinite(physicalShort) &&
    physicalShort > 0 &&
    physicalShort < PHONE_MAX_PHYSICAL_SHORT_EDGE
  ) {
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
    message: 'Admin access is only available on desktop or laptop devices.',
  });
};

module.exports = {
  isLikelyMobileRequest,
  restrictAdminMobileAccess,
};
