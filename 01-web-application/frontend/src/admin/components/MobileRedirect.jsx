import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminDeviceRestriction from './AdminDeviceRestriction';

const MobileRedirect = () => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { logout: globalLogout } = useAuth();

  const handleBackToHome = async () => {
    setIsLoggingOut(true);
    
    try {
      // Get the API URL from environment or use default
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
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
      
      // Use global logout to update auth context
      globalLogout();
      
      // Also clear sessionStorage (global logout only clears localStorage)
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('bypassMobileCheck');
      
      // Trigger auth change event for other components
      window.dispatchEvent(new CustomEvent('authChanged'));
      
      // Redirect to admin login (so user can sign in again or see desktop-only message on mobile)
      navigate('/login', { replace: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear local data and redirect
      globalLogout();
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('bypassMobileCheck');
      window.dispatchEvent(new CustomEvent('authChanged'));
      navigate('/login', { replace: true });
    }
  };

  return (
    <AdminDeviceRestriction onBackHome={handleBackToHome} isLoading={isLoggingOut} />
  );
};

export default MobileRedirect;
