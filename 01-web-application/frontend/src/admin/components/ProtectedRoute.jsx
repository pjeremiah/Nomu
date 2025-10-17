import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ 
  children, 
  requiredRole = 'staff', 
  fallbackPath = '/admin/home' 
}) => {
  // Check both localStorage and sessionStorage for user data
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const localToken = localStorage.getItem('token');
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const sessionToken = sessionStorage.getItem('token');
  
  // Use whichever storage has the data
  const user = Object.keys(localUser).length > 0 ? localUser : sessionUser;
  const token = localToken || sessionToken;
  
  // Check if user is authenticated
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }
  
  // Check user role
  const userRole = user.role;
  
  // Define role hierarchy (higher number = more permissions)
  const roleHierarchy = {
    'staff': 1,
    'manager': 2,
    'superadmin': 3
  };
  
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 1;
  
  // Check if user has sufficient permissions
  if (userLevel < requiredLevel) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
};

export default ProtectedRoute;