import { useState, useEffect } from 'react';
import {
  getDeviceType,
  getViewportMetrics,
  isRestrictedAdminDevice,
} from '../utils/deviceAccess';

const useMobileDetection = () => {
  const [deviceType, setDeviceType] = useState(() => getDeviceType());
  const [viewport, setViewport] = useState(() => getViewportMetrics());

  useEffect(() => {
    const checkDevice = () => {
      setDeviceType(getDeviceType());
      setViewport(getViewportMetrics());
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';

  return {
    isMobile,
    isTablet,
    isSmallScreen: viewport.minViewport < 1024,
    deviceInfo: {
      deviceType,
      ...viewport,
      isRestricted: isRestrictedAdminDevice(),
    },
    shouldShowMobileRedirect: isRestrictedAdminDevice(),
    isMobilePhone: isMobile,
  };
};

export default useMobileDetection;
