import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Smartphone, Shield, AlertTriangle, Home, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MobileRedirectContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #212c59 0%, #5B86E5 50%, #b08d57 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'Montserrat', sans-serif;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(33, 44, 89, 0.15);
  border: 1px solid #e9ecef;
  animation: slideUp 0.6s ease-out;
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const IconContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  gap: 20px;
`;

const MobileIcon = styled.div`
  background: #EB0029;
  color: white;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
`;


const DesktopIcon = styled.div`
  background: #212c59;
  color: white;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`;

const Title = styled.h1`
  color: #212c59;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 15px;
  line-height: 1.3;
`;

const Subtitle = styled.p`
  color: #5a6c7d;
  font-size: 16px;
  margin-bottom: 30px;
  line-height: 1.6;
`;

const RecommendationBox = styled.div`
  background: #f8f9fa;
  border-left: 4px solid #212c59;
  padding: 20px;
  margin: 25px 0;
  border-radius: 8px;
  text-align: left;
`;

const RecommendationTitle = styled.h3`
  color: #212c59;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RecommendationList = styled.ul`
  color: #5a6c7d;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
  padding-left: 20px;
`;

const RecommendationItem = styled.li`
  margin-bottom: 8px;
`;

const AlternativeBox = styled.div`
  background: #e8f5e8;
  border-left: 4px solid #b08d57;
  padding: 20px;
  margin: 25px 0;
  border-radius: 8px;
  text-align: left;
`;

const AlternativeTitle = styled.h3`
  color: #212c59;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const AlternativeText = styled.p`
  color: #5a6c7d;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
`;

const ProhibitionBox = styled.div`
  background: #fff3cd;
  border-left: 4px solid #EB0029;
  padding: 20px;
  margin: 25px 0;
  border-radius: 8px;
  text-align: left;
`;

const ProhibitionTitle = styled.h3`
  color: #EB0029;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ProhibitionText = styled.p`
  color: #856404;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
`;

const ActionButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 30px;
`;


const BackToHomeButton = styled.button`
  background: white;
  color: #212c59;
  border: 2px solid #212c59;
  padding: 12px 25px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  width: 100%;
  
  &:hover {
    background: #212c59;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 6px 25px rgba(33, 44, 89, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DeviceInfo = styled.div`
  background: #e8f4f8;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
  font-size: 12px;
  color: #666;
`;

const MobileRedirect = () => {
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get device information
    const userAgent = navigator.userAgent;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent);
    const isSmallScreen = screenWidth < 1024;
    
    setDeviceInfo({
      isMobile,
      isTablet,
      isSmallScreen,
      screenWidth,
      screenHeight,
      userAgent: userAgent.substring(0, 80) + '...'
    });
  }, []);

  // Removed handleTabletContinue and openInNewTab as per user request

  const handleBackToHome = async () => {
    setIsLoggingOut(true);
    
    try {
      // Get the API URL from environment or use default
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
      
      // Get token from storage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Call logout API if token exists
      if (token) {
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Logout API error:', error);
          // Continue with logout even if API call fails
        }
      }
      
      // Clear all stored authentication data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('bypassMobileCheck');
      
      // Redirect to home page (client side)
      navigate('/', { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local data and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('bypassMobileCheck');
      navigate('/', { replace: true });
    }
  };

  const getDeviceRecommendation = () => {
    if (!deviceInfo) return '';
    
    if (deviceInfo.isMobile) {
      if (deviceInfo.isTablet && deviceInfo.screenWidth >= 1024) {
        return 'Your tablet has a large screen (1024px+ width) and can access admin functions.';
      } else {
        let reason = 'Mobile device detected and strictly prohibited for admin access.';
        if (deviceInfo.hasTouchCapability) {
          reason += ' Touch capability detected.';
        }
        if (deviceInfo.isMobileViewport) {
          reason += ' Mobile viewport detected.';
        }
        reason += ' Please use a desktop, laptop, or large tablet (1024px+ width).';
        return reason;
      }
    } else if (deviceInfo.isTablet) {
      if (deviceInfo.screenWidth >= 1024) {
        return 'Your tablet has a large screen (1024px+ width) and can access admin functions.';
      } else {
        return 'Your tablet screen is too small for admin tasks. Please use a desktop, laptop, or larger tablet (1024px+ width).';
      }
    } else if (deviceInfo.isSmallScreen) {
      return 'Your screen size is small. Consider using a larger screen (1024px+ width) for better admin experience.';
    }
    return '';
  };

  const isMobilePhone = deviceInfo && deviceInfo.isMobile && !deviceInfo.isTablet;

  return (
    <MobileRedirectContainer>
      <Card>
        <IconContainer>
          <MobileIcon>
            <Smartphone size={40} />
          </MobileIcon>
          <DesktopIcon>
            <Smartphone size={40} />
          </DesktopIcon>
        </IconContainer>

        <Title>
          {isMobilePhone ? 'Mobile Access Prohibited' : 'Admin Interface Optimized for Desktop'}
        </Title>
        <Subtitle>
          {isMobilePhone 
            ? 'Mobile phone access to the admin interface is strictly prohibited for security and functionality reasons.'
            : 'The admin dashboard is designed for desktop and laptop computers to provide the best experience for managing your cafe operations.'
          }
          {deviceInfo && getDeviceRecommendation() && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              background: isMobilePhone ? '#fff3cd' : '#e8f4f8', 
              border: `1px solid ${isMobilePhone ? '#ffeaa7' : '#b3d9ff'}`, 
              borderRadius: '6px',
              fontSize: '14px',
              color: isMobilePhone ? '#856404' : '#212c59'
            }}>
              <strong>Device Recommendation:</strong> {getDeviceRecommendation()}
            </div>
          )}
        </Subtitle>

        <RecommendationBox>
          <RecommendationTitle>
            <Smartphone size={20} />
            Recommended Devices for Admin Access
          </RecommendationTitle>
          <RecommendationList>
            <RecommendationItem><strong>Desktop computers:</strong> Windows, Mac, or Linux with full-size monitors</RecommendationItem>
            <RecommendationItem><strong>Laptop computers:</strong> Screen size 13 inches or larger (minimum 1024px width)</RecommendationItem>
            <RecommendationItem><strong>Large tablets:</strong> Screen width 1024px or larger can access admin interface</RecommendationItem>
            <RecommendationItem><strong>Small tablets:</strong> Screen width less than 1024px are blocked</RecommendationItem>
            <RecommendationItem><strong>Mobile phones:</strong> Any mobile user agent is strictly prohibited</RecommendationItem>
            <RecommendationItem><strong>Bypass attempts:</strong> Switching to desktop mode or changing user agent will not work</RecommendationItem>
          </RecommendationList>
        </RecommendationBox>

        {isMobilePhone && (
          <ProhibitionBox>
            <ProhibitionTitle>
              <Shield size={20} />
              Security Policy - No Bypass Allowed
            </ProhibitionTitle>
            <ProhibitionText>
              Mobile device access to admin functions is strictly prohibited and cannot be bypassed:
              <br />
              • <strong>Device detection:</strong> System detects mobile devices by multiple methods
              <br />
              • <strong>Touch capability:</strong> Touch-enabled devices are blocked regardless of screen size
              <br />
              • <strong>Security concerns:</strong> Mobile devices are more vulnerable to security breaches
              <br />
              • <strong>Data protection:</strong> Sensitive admin data requires secure desktop environments
              <br />
              • <strong>Functionality limitations:</strong> Admin interface requires full desktop features
              <br />
              • <strong>Company policy:</strong> Administrative access restricted to desktop/laptop only
              <br />
              • <strong>No bypass methods:</strong> Switching to desktop mode, changing user agent, or any other method will not work
            </ProhibitionText>
          </ProhibitionBox>
        )}

        <AlternativeBox>
          <AlternativeTitle>
            <Smartphone size={20} />
            Alternative Access Methods
          </AlternativeTitle>
          <AlternativeText>
            For mobile access to cafe management features, use these appropriate applications:
            <br />
            • <strong>Customer App:</strong> For customer-facing features and orders (mobile phones)
            <br />
            • <strong>Barista App:</strong> For staff operations and order management (mobile phones)
            <br />
            • <strong>Web Admin:</strong> For full administrative control (desktop/laptop/large tablets only)
            <br />
            • <strong>Large Tablets:</strong> Screen width 1024px+ can access web admin interface
          </AlternativeText>
        </AlternativeBox>

        <ActionButtons>
          
          {isMobilePhone && (
            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              <AlertTriangle size={20} style={{ marginBottom: '8px', color: '#EB0029' }} />
              <div><strong>No bypass available for mobile phones</strong></div>
              <div>Please use a desktop or laptop computer to access admin functions</div>
            </div>
          )}

          {/* Back to Home Page Button - Always visible for mobile users */}
          <div style={{
            background: '#e8f4f8',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #b3d9ff',
            textAlign: 'center',
            color: '#212c59',
            fontSize: '14px',
            marginTop: '20px'
          }}>
            <Home size={20} style={{ marginBottom: '8px', color: '#212c59' }} />
            <div><strong>Need to access the client side?</strong></div>
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#5a6c7d' }}>
              Click below to log out and return to the home page
            </div>
          </div>
          
          <BackToHomeButton onClick={handleBackToHome} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <>
                <LogOut size={20} />
                Logging Out...
              </>
            ) : (
              <>
                <Home size={20} />
                Back to Home Page
              </>
            )}
          </BackToHomeButton>
          
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: '#212c59',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline',
              marginTop: '10px'
            }}
          >
            {showAdvanced ? 'Hide' : 'Show'} Technical Details
          </button>
        </ActionButtons>

        {deviceInfo && showAdvanced && (
          <DeviceInfo>
            <strong>Device Detected:</strong> {deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop'} Device
            <br />
            <strong>Screen Size:</strong> {deviceInfo.screenWidth} x {deviceInfo.screenHeight} pixels
            <br />
            <strong>User Agent:</strong> {deviceInfo.userAgent}
            <br />
            <strong>Small Screen:</strong> {deviceInfo.isSmallScreen ? 'Yes' : 'No'}
          </DeviceInfo>
        )}
      </Card>
    </MobileRedirectContainer>
  );
};

export default MobileRedirect;
