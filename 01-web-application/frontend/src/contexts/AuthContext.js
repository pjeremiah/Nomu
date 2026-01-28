import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthentication = () => {
    const token = localStorage.getItem('token');
    console.log('🔐 Global auth check - token exists:', !!token);
    
    if (!token) {
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }

    // Check if token has valid JWT format (3 parts separated by dots)
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid token format, removing token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired
        console.log('❌ Token expired, removing token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
        return false;
      }
      
      // Token is valid
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('✅ Token is valid, setting authenticated to true');
      setIsAuthenticated(true);
      setUser(userData);
      setLoading(false);
      return true;
    } catch (error) {
      // Invalid token format
      console.log('❌ Invalid token format, removing token:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);
      return false;
    }
  };

  const login = (userData) => {
    console.log('🔐 Global login called with userData:', userData);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    console.log('🔐 Global logout called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Check authentication on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Listen for storage changes (token updates from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        console.log('🔄 Token or user changed in localStorage, rechecking authentication...');
        checkAuthentication();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen for custom auth events
  useEffect(() => {
    const handleAuthChange = () => {
      console.log('🔄 Custom auth change event received');
      checkAuthentication();
    };

    window.addEventListener('authChanged', handleAuthChange);
    return () => window.removeEventListener('authChanged', handleAuthChange);
  }, []);

  const value = {
    isAuthenticated,
    user,
    loading,
    checkAuthentication,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
