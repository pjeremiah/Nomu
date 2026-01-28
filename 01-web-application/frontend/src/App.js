import styled, { ThemeProvider } from "styled-components";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ScrollToTop from './components/ScrollToTop';
import { lightTheme, darkTheme } from "./utils/Themes";
import { createContext, useContext, useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./client/Home";
import Location from "./client/Location";
import AboutUs from "./client/AboutUs";
import ContactUs from "./client/ContactUs";
import Gallery from "./client/Gallery";
import Menu from "./client/Menu";
import AccountSettings from "./client/AccountSettings";
import SignInForm from "./client/SignInForm";
import SignUpForm from "./client/SignUpForm";
import MobileSignIn from "./client/MobileSignIn";
import MobileSignUp from "./client/MobileSignUp";
import MobileForgotPassword from "./client/MobileForgotPassword";
import { AuthProvider } from "./contexts/AuthContext";

// Admin components
import AdminLayout from './admin/layout/AdminLayout';
import AdminHome from './admin/AdminHome';
import ManageAdmins from './admin/ManageAdmins';
import MenuManagement from './admin/MenuManagement';
import InventoryManagement from './admin/InventoryManagement';
import RewardManagement from './admin/RewardManagement';
import PromoManagement from './admin/PromoManagement';
import CustomerFeedback from './admin/CustomerFeedback';
import GalleryManagement from './admin/GalleryManagement';
import ProtectedRoute from './admin/components/ProtectedRoute';
import { ModalProvider } from './admin/context/ModalContext';

import 'bootstrap/dist/css/bootstrap.min.css';

// Theme Context
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    console.error('useTheme must be used within a ThemeProvider');
    return { isDarkMode: false, toggleTheme: () => {} };
  }
  return context;
};

const Container = styled.div`
  background-color: ${props => props.theme.bg};
  color: ${props => props.theme.text_primary};
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
`;

// Component to check if user is admin
const RequireAdmin = ({ children }) => {
  // Check both localStorage and sessionStorage for user data
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const localToken = localStorage.getItem('token');
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const sessionToken = sessionStorage.getItem('token');

  // Use whichever storage has the data
  const user = Object.keys(localUser).length > 0 ? localUser : sessionUser;
  const token = localToken || sessionToken;

  if (!token || (user.role !== 'superadmin' && user.role !== 'manager' && user.role !== 'staff')) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Component to check if user is NOT admin (for client routes)
const RequireClient = ({ children }) => {
  // Check both localStorage and sessionStorage for user data
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const localToken = localStorage.getItem('token');
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const sessionToken = sessionStorage.getItem('token');

  // Use whichever storage has the data
  const user = Object.keys(localUser).length > 0 ? localUser : sessionUser;
  const token = localToken || sessionToken;

  if (token && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff')) {
    return <Navigate to="/admin/home" replace />;
  }
  return children;
};

// Component to conditionally render navbar based on current route
const ConditionalNavbar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Check both localStorage and sessionStorage for user data
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const localToken = localStorage.getItem('token');
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const sessionToken = sessionStorage.getItem('token');

  // Use whichever storage has the data
  const user = Object.keys(localUser).length > 0 ? localUser : sessionUser;
  const token = localToken || sessionToken;

  const isAdminUser = token && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff');    
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname === '/signin' || location.pathname === '/signup' || location.pathname === '/forgotpassword';

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide navbar if:
  // 1. On admin route OR user is admin (regardless of route)
  // 2. On signin/signup routes AND in mobile mode (mobile has its own full-page UI)
  if (isAdminRoute || isAdminUser || (isAuthRoute && isMobile)) {
    return null;
  }

  return <Navbar />;
};

// Component to conditionally render sign in page (mobile vs desktop)
const ConditionalSignIn = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mobile: show full-page mobile sign in
  // On desktop: show desktop form (which will be used in modal or as standalone page)
  if (isMobile) {
    return <MobileSignIn />;
  }
  
  // Desktop: show the form component (can be used in modal or as page)
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <SignInForm />
      </div>
    </div>
  );
};

// Component to conditionally render sign up page (mobile vs desktop)
const ConditionalSignUp = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mobile: show full-page mobile sign up
  // On desktop: show desktop form (which will be used in modal or as standalone page)
  if (isMobile) {
    return <MobileSignUp />;
  }
  
  // Desktop: show the form component (can be used in modal or as page)
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '2.5rem',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <SignUpForm />
      </div>
    </div>
  );
};

// Component to conditionally render forgot password page (mobile vs desktop)
const ConditionalForgotPassword = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // On mobile: show full-page mobile forgot password
  // On desktop: redirect to home (forgot password is only available in modal on desktop)
  if (isMobile) {
    return <MobileForgotPassword />;
  }
  
  // Desktop: redirect to home (forgot password should be accessed via modal)
  return <Navigate to="/" replace />;
};

function App() {
  // Always use light theme
  const isDarkMode = false;
  const toggleTheme = () => {}; // No-op function

  const currentTheme = lightTheme;

  // Handle admin redirect after login and logout
  useEffect(() => {
    const handleAuthChange = () => {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const localToken = localStorage.getItem('token');
      const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
      const sessionToken = sessionStorage.getItem('token');

      // Use whichever storage has the data
      const user = Object.keys(localUser).length > 0 ? localUser : sessionUser;
      const token = localToken || sessionToken;

      // If user is admin and not on admin route, redirect to admin
      if (token && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff')) {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/admin')) {
          window.location.href = '/admin/home';
        }
      }
      // If no token and on admin route, redirect to home
      else if (!token && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/';
      }
    };

    // Listen for auth changes
    window.addEventListener('authChanged', handleAuthChange);
    
    // Check on initial load
    handleAuthChange();

    return () => {
      window.removeEventListener('authChanged', handleAuthChange);
    };
  }, []);


  return (
    <AuthProvider>
      <BrowserRouter>
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
          <ThemeProvider theme={currentTheme}>
            <ScrollToTop />
            <Container>
              {/* Use the conditional navbar component */}
              <ConditionalNavbar />
              <Routes>
            {/* Admin Routes - Restricted to admin users only */}
            <Route path="/admin/*" element={
              <RequireAdmin>
                <ModalProvider>
                  <AdminLayout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/admin/home" replace />} />
                      <Route path="/home" element={<AdminHome />} />

                      {/* Protected Routes - Require Manager or Owner */}
                      <Route path="/manage-admins" element={
                        <ProtectedRoute requiredRole="manager" fallbackPath="/admin/home">
                          <ManageAdmins />
                        </ProtectedRoute>
                      } />

                      <Route path="/menu-management" element={
                        <ProtectedRoute requiredRole="manager" fallbackPath="/admin/home">
                          <MenuManagement />
                        </ProtectedRoute>
                      } />

                      <Route path="/inventory-management" element={
                        <ProtectedRoute requiredRole="manager" fallbackPath="/admin/home">
                          <InventoryManagement />
                        </ProtectedRoute>
                      } />

                      {/* Open Routes - Available to all admin users */}
                      <Route path="/reward-management" element={<RewardManagement />} />
                      <Route path="/promo-management" element={<PromoManagement />} />
                      <Route path="/customer-feedback" element={<CustomerFeedback />} />
                      <Route path="/gallery-management" element={
                        <ProtectedRoute requiredRole="staff" fallbackPath="/admin/home">
                          <GalleryManagement />
                        </ProtectedRoute>
                      } />
                      <Route path="*" element={<Navigate to="/admin/home" replace />} />
                    </Routes>
                  </AdminLayout>
                </ModalProvider>
              </RequireAdmin>
            } />

            {/* Client Routes - Restricted to non-admin users */}
            <Route path="/" element={<RequireClient><Home /></RequireClient>} />
            <Route path="/aboutus" element={<RequireClient><AboutUs /></RequireClient>} />
            <Route path="/menu" element={<RequireClient><Menu /></RequireClient>} />
            <Route path="/gallery" element={<RequireClient><Gallery /></RequireClient>} />
            <Route path="/location" element={<RequireClient><Location /></RequireClient>} />
            <Route path="/contactus" element={<RequireClient><ContactUs /></RequireClient>} />
            <Route path="/account-settings" element={<RequireClient><AccountSettings /></RequireClient>} />
            <Route path="/signin" element={<RequireClient><ConditionalSignIn /></RequireClient>} />
            <Route path="/signup" element={<RequireClient><ConditionalSignUp /></RequireClient>} />
            <Route path="/forgotpassword" element={<RequireClient><ConditionalForgotPassword /></RequireClient>} />

            {/* Catch all route - redirect based on user role */}
            <Route path="*" element={<CatchAllRoute />} />
              </Routes>
            </Container>
          </ThemeProvider>
        </ThemeContext.Provider>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Component to handle catch-all routes and redirect appropriately
const CatchAllRoute = () => {
  // Check both localStorage and sessionStorage for user data
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const localToken = localStorage.getItem('token');
  const sessionUser = JSON.parse(sessionStorage.getItem('user') || '{}');
  const sessionToken = sessionStorage.getItem('token');

  // Use whichever storage has the data
  const user = Object.keys(localUser).length > 0 ? localUser : sessionUser;
  const token = localToken || sessionToken;

  if (token && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff')) {
    return <Navigate to="/admin/home" replace />;
  }

  return <Navigate to="/" replace />;
};

export default App;