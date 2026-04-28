const TABLET_UA_REGEX = /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T|Tab/i;
const MOBILE_UA_REGEX = /iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile|Mobile/i;

const getDeviceType = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const hasTouch = maxTouchPoints > 0 || 'ontouchstart' in window;
  const screenWidth = window.innerWidth;
  const profile = `${userAgent} ${platform}`;

  const isTabletByUserAgent = TABLET_UA_REGEX.test(profile) || /Android(?!.*Mobile)/i.test(userAgent);
  const isIpadOsDesktopMode = /MacIntel/i.test(platform) && hasTouch;
  if (isTabletByUserAgent || isIpadOsDesktopMode) {
    return 'tablet';
  }

  const isMobileByUserAgent = MOBILE_UA_REGEX.test(userAgent) || /Android.*Mobile/i.test(userAgent);
  const touchPhoneProfile = hasTouch && screenWidth < 1024;
  if (isMobileByUserAgent || touchPhoneProfile) {
    return 'mobile';
  }

  return 'desktop';
};

export const isRestrictedAdminDevice = () => {
  return getDeviceType() === 'mobile';
};

export const getAdminMobileContextHeader = () => (
  isRestrictedAdminDevice() ? 'mobile' : 'desktop'
);

export const getAdminDeviceTypeHeader = () => getDeviceType();
