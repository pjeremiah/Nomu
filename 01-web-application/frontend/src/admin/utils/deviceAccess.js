/**
 * Admin access is blocked on phones only (Android & iOS), including when the browser
 * uses "Desktop site" / desktop UA. Detection uses physical screen size + touch, not
 * only viewport or spoofed user agent. Tablets and iPads stay allowed.
 */

/** Smallest physical screen edge below this → phone (iPad Mini portrait ≈ 744). */
export const ADMIN_TABLET_MIN_VIEWPORT = 600;

const TABLET_UA_REGEX =
  /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T|Tab|KFAPWI|KFJWI|KFMEWI|Lenovo TB|HUAWEI MediaPad|Mi Pad/i;

/** Phone user agents — do not match bare "Mobile" (iPad Safari includes Mobile/15E148). */
const PHONE_UA_REGEX = /iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;
const ANDROID_PHONE_UA_REGEX = /Android.*Mobile/i;

/** Physical device screen (CSS px), not layout viewport — stable in "Desktop site" mode. */
export const getPhysicalScreenMetrics = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0, min: 0, max: 0 };
  }
  const width = window.screen?.width ?? 0;
  const height = window.screen?.height ?? 0;
  return {
    width,
    height,
    min: Math.min(width, height),
    max: Math.max(width, height),
  };
};

export const getViewportMetrics = () => {
  if (typeof window === 'undefined') {
    return { screenWidth: 0, screenHeight: 0, minViewport: 0, maxViewport: 0 };
  }
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  return {
    screenWidth,
    screenHeight,
    minViewport: Math.min(screenWidth, screenHeight),
    maxViewport: Math.max(screenWidth, screenHeight),
  };
};

const isTouchDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  return Number(navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
};

/** True when the device panel is phone-sized (works with Android/iOS desktop site). */
export const isPhoneSizedPhysicalScreen = () => {
  const { min } = getPhysicalScreenMetrics();
  return min > 0 && min < ADMIN_TABLET_MIN_VIEWPORT;
};

const isPhoneByClientHints = () => {
  try {
    return navigator.userAgentData?.mobile === true;
  } catch {
    return false;
  }
};

const isTabletByUserAgent = (profile, userAgent) =>
  TABLET_UA_REGEX.test(profile) || /Android(?!.*Mobile)/i.test(userAgent);

const isIpadOsDesktopMode = (platform, maxTouchPoints, hasTouch) =>
  (/MacIntel/i.test(platform) || /Macintosh/i.test(platform)) && hasTouch && maxTouchPoints > 1;

const hasTabletSizedViewport = (minViewport) => minViewport >= ADMIN_TABLET_MIN_VIEWPORT;

export const getDeviceType = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop';
  }

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const hasTouch = isTouchDevice();
  const { minViewport } = getViewportMetrics();
  const profile = `${userAgent} ${platform}`;

  const isPhoneByUserAgent =
    PHONE_UA_REGEX.test(userAgent) || ANDROID_PHONE_UA_REGEX.test(userAgent);

  if (isPhoneByUserAgent) {
    return 'mobile';
  }

  if (isPhoneByClientHints()) {
    return 'mobile';
  }

  // Android/iOS "Request desktop site": UA/viewport look like desktop; screen size does not.
  if (hasTouch && isPhoneSizedPhysicalScreen()) {
    return 'mobile';
  }

  if (isIpadOsDesktopMode(platform, maxTouchPoints, hasTouch)) {
    return isPhoneSizedPhysicalScreen() ? 'mobile' : 'tablet';
  }

  if (isTabletByUserAgent(profile, userAgent)) {
    return 'tablet';
  }

  if (hasTouch && hasTabletSizedViewport(minViewport)) {
    return 'tablet';
  }

  if (hasTouch && minViewport < ADMIN_TABLET_MIN_VIEWPORT) {
    return 'mobile';
  }

  return 'desktop';
};

export const isRestrictedAdminDevice = () => getDeviceType() === 'mobile';

export const getAdminMobileContextHeader = () =>
  isRestrictedAdminDevice() ? 'mobile' : 'desktop';

export const getAdminDeviceTypeHeader = () => getDeviceType();

/** Sent on admin login API calls so the server can block phone hardware in desktop-site mode. */
export const getAdminPhysicalShortHeader = () =>
  String(getPhysicalScreenMetrics().min || 0);

export const getAdminDeviceHeaders = () => ({
  'X-Admin-Mobile-Context': getAdminMobileContextHeader(),
  'X-Admin-Device-Type': getAdminDeviceTypeHeader(),
  'X-Admin-Physical-Short': getAdminPhysicalShortHeader(),
});
