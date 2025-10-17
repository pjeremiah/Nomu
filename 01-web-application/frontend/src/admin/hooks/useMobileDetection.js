import { useState, useEffect } from 'react';

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = window.innerWidth;
      
      // Comprehensive mobile device detection
      const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS|FxiOS|EdgiOS/i;
      const isMobileDevice = mobileRegex.test(userAgent);
      
      // Check if it's a tablet (more specific detection)
      const tabletRegex = /iPad|Android(?=.*\bMobile\b)|Tablet/i;
      const isTabletDevice = tabletRegex.test(userAgent);
      
      // Check screen size - laptop/desktop minimum is 1024px
      const isSmallScreenDevice = screenWidth < 1024;
      
      // Additional mobile indicators
      const hasTouchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileViewport = window.innerWidth <= 1024 || window.innerHeight <= 768;
      
      // Mobile detection: mobile user agent OR touch device with small screen
      // Allow large tablets (1024px+ width) to access admin
      const isDefinitelyMobile = isMobileDevice || (hasTouchCapability && isMobileViewport && screenWidth < 1024);
      
      setIsMobile(isDefinitelyMobile);
      setIsTablet(isTabletDevice && !isDefinitelyMobile);
      setIsSmallScreen(isSmallScreenDevice);
      
      setDeviceInfo({
        userAgent,
        screenWidth,
        screenHeight: window.innerHeight,
        isMobileDevice,
        isTabletDevice,
        isSmallScreenDevice,
        hasTouchCapability,
        isMobileViewport,
        isDefinitelyMobile
      });
    };

    // Initial check
    checkDevice();

    // Listen for resize events
    const handleResize = () => {
      checkDevice();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return {
    isMobile,
    isTablet,
    isSmallScreen,
    deviceInfo,
    shouldShowMobileRedirect: isMobile, // Redirect mobile devices and small tablets
    isMobilePhone: isMobile && !isTablet
  };
};

export default useMobileDetection;
