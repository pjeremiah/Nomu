import styled, { ThemeProvider } from "styled-components";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ScrollToTop from './components/ScrollToTop';
import ScrollToTopButton from './components/ScrollToTopButton';
import { lightTheme, darkTheme } from "./utils/Themes";
import { createContext, useContext, useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./client/Home";
import Location from "./client/Location";
import AboutUs from "./client/AboutUs";
import ContactUs from "./client/ContactUs";
import Gallery from "./client/Gallery";
import NomuApp from "./client/NomuApp";
import Menu from "./client/Menu";
import { AuthProvider } from "./contexts/AuthContext";

// Admin components
import AdminLayout from './admin/layout/AdminLayout';
import AdminLogin from './admin/AdminLogin';
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
    return <Navigate to="/login" replace />;
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
  const isLoginRoute = location.pathname === '/login';

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hide navbar on admin login page or admin routes or when user is admin
  if (isLoginRoute || isAdminRoute || isAdminUser) {
    return null;
  }

  return <Navbar />;
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
      // If no token and on admin route, redirect to admin login
      else if (!token && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
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
            <ScrollToTopButton />
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

            {/* Admin login - dedicated route (e.g. domain/login) */}
            <Route path="/login" element={<AdminLogin />} />

            {/* Client Routes - Restricted to non-admin users (no customer sign-in on web; that's in the mobile app) */}
            <Route path="/" element={<RequireClient><Home /></RequireClient>} />
            <Route path="/aboutus" element={<RequireClient><AboutUs /></RequireClient>} />
            <Route path="/menu" element={<RequireClient><Menu /></RequireClient>} />
            <Route path="/gallery" element={<RequireClient><Gallery /></RequireClient>} />
            <Route path="/nomu-app" element={<RequireClient><NomuApp /></RequireClient>} />
            <Route path="/location" element={<RequireClient><Location /></RequireClient>} />
            <Route path="/contactus" element={<RequireClient><ContactUs /></RequireClient>} />

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