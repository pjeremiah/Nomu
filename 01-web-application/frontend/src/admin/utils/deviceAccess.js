/**
 * Admin access is blocked on phones only. Tablets and iPads are allowed in
 * portrait and landscape (viewport checked on the shortest edge so rotation
 * does not flip a tablet into "phone" mode).
 */

/** Smallest viewport edge at or above this → treat as tablet (iPad Mini portrait ≈ 744). */
export const ADMIN_TABLET_MIN_VIEWPORT = 600;

const TABLET_UA_REGEX =
  /iPad|Tablet|PlayBook|Silk|Kindle|Nexus 7|Nexus 10|SM-T|Tab|KFAPWI|KFJWI|KFMEWI|Lenovo TB|HUAWEI MediaPad|Mi Pad/i;

/** Phone user agents only — do not match bare "Mobile" (iPad Safari includes Mobile/15E148). */
const PHONE_UA_REGEX = /iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|IEMobile/i;
const ANDROID_PHONE_UA_REGEX = /Android.*Mobile/i;

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
  const hasTouch = maxTouchPoints > 0 || 'ontouchstart' in window;
  const { minViewport } = getViewportMetrics();
  const profile = `${userAgent} ${platform}`;

  if (isTabletByUserAgent(profile, userAgent) || isIpadOsDesktopMode(platform, maxTouchPoints, hasTouch)) {
    return 'tablet';
  }

  // Touch device with tablet-sized shortest edge (portrait or landscape).
  if (hasTouch && hasTabletSizedViewport(minViewport)) {
    return 'tablet';
  }

  const isPhoneByUserAgent =
    PHONE_UA_REGEX.test(userAgent) || ANDROID_PHONE_UA_REGEX.test(userAgent);

  if (isPhoneByUserAgent || (hasTouch && minViewport < ADMIN_TABLET_MIN_VIEWPORT)) {
    return 'mobile';
  }

  return 'desktop';
};

export const isRestrictedAdminDevice = () => getDeviceType() === 'mobile';

export const getAdminMobileContextHeader = () =>
  isRestrictedAdminDevice() ? 'mobile' : 'desktop';

export const getAdminDeviceTypeHeader = () => getDeviceType();
