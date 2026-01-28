// Test script for mobile detection logic
// This can be run in browser console to test the detection

const testMobileDetection = () => {
  console.log('🧪 Testing Mobile Detection Logic...\n');
  
  // Simulate different user agents
  const testCases = [
    {
      name: 'iPhone Safari',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      screenWidth: 375,
      expected: { isMobile: true, isTablet: false, shouldRedirect: true }
    },
    {
      name: 'Android Phone',
      userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
      screenWidth: 360,
      expected: { isMobile: true, isTablet: false, shouldRedirect: true }
    },
    {
      name: 'iPad',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
      screenWidth: 768,
      expected: { isMobile: false, isTablet: true, shouldRedirect: false }
    },
    {
      name: 'Desktop Chrome',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      screenWidth: 1920,
      expected: { isMobile: false, isTablet: false, shouldRedirect: false }
    },
    {
      name: 'Small Desktop Screen',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      screenWidth: 1023,
      expected: { isMobile: false, isTablet: false, shouldRedirect: false }
    }
  ];

  testCases.forEach(testCase => {
    console.log(`📱 Testing: ${testCase.name}`);
    
    // Simulate the detection logic
    const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const isMobileDevice = mobileRegex.test(testCase.userAgent);
    const isTabletDevice = /iPad|Android(?=.*\bMobile\b)/i.test(testCase.userAgent);
    const isSmallScreen = testCase.screenWidth < 1024;
    const isDefinitelyMobile = isMobileDevice || testCase.screenWidth < 768;
    const shouldShowMobileRedirect = isDefinitelyMobile && !sessionStorage.getItem('bypassMobileCheck');
    
    const result = {
      isMobile: isDefinitelyMobile,
      isTablet: isTabletDevice && !isDefinitelyMobile,
      shouldRedirect: shouldShowMobileRedirect
    };
    
    // Check if results match expected
    const passed = 
      result.isMobile === testCase.expected.isMobile &&
      result.isTablet === testCase.expected.isTablet &&
      result.shouldRedirect === testCase.expected.shouldRedirect;
    
    console.log(`   User Agent: ${testCase.userAgent.substring(0, 50)}...`);
    console.log(`   Screen Width: ${testCase.screenWidth}px`);
    console.log(`   Result: Mobile=${result.isMobile}, Tablet=${result.isTablet}, Redirect=${result.shouldRedirect}`);
    console.log(`   Expected: Mobile=${testCase.expected.isMobile}, Tablet=${testCase.expected.isTablet}, Redirect=${testCase.expected.shouldRedirect}`);
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  });
  
  console.log('🎯 Test Summary:');
  console.log('- Mobile phones should trigger redirect');
  console.log('- Tablets should NOT trigger redirect (can be used for basic tasks)');
  console.log('- Desktop should NOT trigger redirect');
  console.log('- Small screens should NOT trigger redirect (unless mobile)');
  console.log('\n💡 To test in browser:');
  console.log('1. Open admin page on desktop');
  console.log('2. Open DevTools > Device Toolbar');
  console.log('3. Select mobile device');
  console.log('4. Refresh page - should see mobile redirect');
  console.log('5. Click "Continue Anyway" to bypass');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testMobileDetection = testMobileDetection;
  console.log('🧪 Mobile detection test loaded! Run testMobileDetection() to test.');
}

export default testMobileDetection;
