import React from 'react';
import useMobileDetection from '../hooks/useMobileDetection';
import styled from 'styled-components';

const TestContainer = styled.div`
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 20px;
  font-family: 'Montserrat', sans-serif;
`;

const TestTitle = styled.h3`
  color: #2c3e50;
  margin-bottom: 15px;
`;

const TestItem = styled.div`
  background: white;
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
  border-left: 4px solid ${props => props.isTrue ? '#28a745' : '#dc3545'};
`;

const TestLabel = styled.strong`
  color: ${props => props.isTrue ? '#28a745' : '#dc3545'};
`;

// This component is for testing purposes only
const MobileDetectionTest = () => {
  const { isMobile, isTablet, isSmallScreen, deviceInfo, shouldShowMobileRedirect } = useMobileDetection();

  return (
    <TestContainer>
      <TestTitle>Mobile Detection Test</TestTitle>
      
      <TestItem isTrue={isMobile}>
        <TestLabel isTrue={isMobile}>Is Mobile:</TestLabel> {isMobile ? 'Yes' : 'No'}
      </TestItem>
      
      <TestItem isTrue={isTablet}>
        <TestLabel isTrue={isTablet}>Is Tablet:</TestLabel> {isTablet ? 'Yes' : 'No'}
      </TestItem>
      
      <TestItem isTrue={isSmallScreen}>
        <TestLabel isTrue={isSmallScreen}>Is Small Screen:</TestLabel> {isSmallScreen ? 'Yes' : 'No'}
      </TestItem>
      
      <TestItem isTrue={shouldShowMobileRedirect}>
        <TestLabel isTrue={shouldShowMobileRedirect}>Should Show Mobile Redirect:</TestLabel> {shouldShowMobileRedirect ? 'Yes' : 'No'}
      </TestItem>
      
      {deviceInfo && (
        <div style={{ marginTop: '15px' }}>
          <h4>Device Information:</h4>
          <p><strong>Screen Size:</strong> {deviceInfo.screenWidth} x {deviceInfo.screenHeight}</p>
          <p><strong>User Agent:</strong> {deviceInfo.userAgent}</p>
          <p><strong>Mobile Device:</strong> {deviceInfo.isMobileDevice ? 'Yes' : 'No'}</p>
          <p><strong>Tablet Device:</strong> {deviceInfo.isTabletDevice ? 'Yes' : 'No'}</p>
        </div>
      )}
    </TestContainer>
  );
};

export default MobileDetectionTest;
