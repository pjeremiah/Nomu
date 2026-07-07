import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import NavbarandFooterImg from '../../utils/Images/ForNavbarandFooter.jpg';
import NomuLogo from '../../utils/Images/Logo.png';
import { Lock, BarChart3, Users, Coffee, Gift, Star, MessageSquare, X, LogOut, Package, Smartphone, Grid3X3 } from 'lucide-react';
import { useModalContext } from '../context/ModalContext';
import useMobileDetection from '../hooks/useMobileDetection';
import MobileRedirect from '../components/MobileRedirect';
import { useAuth } from '../../contexts/AuthContext';
import '../styles/adminTablet.css';

/** Served from web `public/` (same pattern as customer app APK on NomuApp page). */
const DOWNLOAD_BARISTA_APK_URL = '/Nomu-Barista-Application.apk?v=1017';

const Page = styled.div`
  display: flex;
  min-height: 100vh;
  background: #ffffff;
`;

/* Static Sidebar */
const Sidebar = styled.aside`
  position: fixed !important;
  top: 0;
  left: 0;
  width: 220px;
  height: 100vh;
  max-height: 100vh;
  background-image: url(${NavbarandFooterImg});
  background-size: cover;
  background-position: center;
  color: #fff;
  padding: 12px 10px;
  overflow-y: auto !important; /* Allow vertical scrolling when content exceeds viewport */
  overflow-x: hidden !important; /* Prevent horizontal scrolling */
  z-index: 1000;
  display: flex;
  flex-direction: column;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
  
  /* Ensure content can scroll */
  box-sizing: border-box;
`;

const Shade = styled.div`
  background: #003466B3;
  padding: 6px 8px;
  height: calc(100vh - 24px); /* Account for sidebar padding */
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
`;

const Brand = styled.div`
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 16px;
  padding: 0px 0;
  width: 100%;
  display: block;
`;

const LogoSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 0;
`;

const LogoImage = styled.img`
  width: 50px;
  height: 50px;
  margin-bottom: 8px;
  object-fit: contain;
  filter: brightness(0) invert(1);
`;

const BrandName = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: #ffffff;
  text-align: center;
  margin: 0;
`;

const AdminInfo = styled.div`
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 12px;
  text-align: center;
  width: calc(100% - 10px);
  margin-left: 2px;
  margin-right: 2px;
`;

const AdminTitle = styled.div`
  font-weight: 600;
  font-size: 11px;
  color: #ffffff;
  margin-bottom: 2px;
`;

const AdminName = styled.div`
  font-weight: 500;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  border: 1px solid transparent;
  
  /* Keep label typography identical for all items; only background differs for active */
  &.active, &:hover { 
    background: rgba(255,255,255,0.15); 
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    font-weight: 500;
    color: #ffffff;
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  &.locked {
    cursor: not-allowed;
    position: relative;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.65);
    pointer-events: auto;
    padding-right: 12px;
    overflow: hidden;
  }
  
  &.locked:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.65);
  }
`;

const DownloadButton = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  width: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  
  &:hover { 
    background: rgba(255,255,255,0.15); 
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  width: calc(100% - 10px);
  margin-left: 2px;
  margin-right: 2px;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  white-space: nowrap;
  
  &:hover { 
    background: rgba(255,255,255,0.15); 
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  &:focus {
    outline: 2px solid rgba(255,255,255,0.3);
    outline-offset: 2px;
  }
  
  &:active {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  }
`;

const NavIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
`;

const NavLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LockIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  min-width: 18px;
  margin-left: auto;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.45);
  opacity: 0.85;
`;

const Tooltip = styled.div`
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
  
  &::before {
    content: '';
    position: absolute;
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    border: 4px solid transparent;
    border-right-color: rgba(0, 0, 0, 0.8);
  }
`;

const NavItemContainer = styled.div`
  position: relative;
  
  &:hover .tooltip {
    opacity: 1;
    visibility: visible;
  }
`;

/* Main content leaves space for sidebar */
const Main = styled.main`
  flex: 1;
  min-width: 0;
  width: calc(100vw - 220px);
  max-width: calc(100vw - 220px);
  margin-left: 220px;
  padding: 15px;
  box-sizing: border-box;
  overflow-x: hidden;

  @media (max-width: 1366px) {
    padding: 12px;
  }

  @media (max-width: 1024px) {
    padding: 10px;
  }
`;

/* Fade In Animation - removed as it's not being used */



const AdminLayout = ({ children }) => {
  const { showLogoutConfirm, setShowLogoutConfirm } = useModalContext();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('staff');
  const navigate = useNavigate();
  const { shouldShowMobileRedirect, isMobilePhone } = useMobileDetection();
  const { logout: globalLogout } = useAuth();

  // Fetch current user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!token) {
          navigate('/login');
          return;
        }
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          setUserRole(userData.role || 'staff');
        } else {
          // API failed: use stored user as fallback (e.g. right after OTP login /me can be slow or fail briefly)
          if (userJson) {
            try {
              const storedUser = JSON.parse(userJson);
              if (storedUser.role === 'superadmin' || storedUser.role === 'manager' || storedUser.role === 'staff') {
                setCurrentUser(storedUser);
                setUserRole(storedUser.role || 'staff');
                return;
              }
            } catch (_) {}
          }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          navigate('/login');
        }
      } catch (error) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (token && userJson) {
          try {
            const storedUser = JSON.parse(userJson);
            if (storedUser.role === 'superadmin' || storedUser.role === 'manager' || storedUser.role === 'staff') {
              setCurrentUser(storedUser);
              setUserRole(storedUser.role || 'staff');
              return;
            }
          } catch (_) {}
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/login');
      }
    };

    fetchUserInfo();
  }, [navigate]);

  // Web session heartbeat (does not affect barista app active/inactive on Manage Admins)
  useEffect(() => {
    if (!currentUser) return;

    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
          const response = await fetch(`${API_URL}/api/auth/heartbeat`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          
          if (!response.ok) {
            // If token is invalid or expired, clear it and redirect to login
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              navigate('/login');
            }
            // For other errors (like 400), just silently ignore
            return;
          }
        }
      } catch (error) {
        // Silently handle heartbeat errors - don't log to console
      }
    };

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    
    // Send initial heartbeat
    sendHeartbeat();

    return () => clearInterval(heartbeatInterval);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      // Check both localStorage and sessionStorage for token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Use global logout to update auth context
      globalLogout();
      
      // Also clear sessionStorage (global logout only clears localStorage)
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      // Trigger auth change event for other components
      window.dispatchEvent(new CustomEvent('authChanged'));
      
      navigate('/login');
    }
  };

  // Check if user can access restricted sections
  const canAccessManageAdmins = userRole === 'superadmin' || userRole === 'manager';
  const canAccessMenuManagement = userRole === 'superadmin' || userRole === 'manager';
  const canAccessInventoryManagement = userRole === 'superadmin' || userRole === 'manager';
  const canAccessGalleryManagement = userRole === 'superadmin' || userRole === 'manager';

  // Helper function to get logo section
  const getLogoSection = () => {
    return (
      <LogoSection>
        <LogoImage src={NomuLogo} alt="Nomu Cafe Logo" />
        <BrandName>Nomu Cafe</BrandName>
      </LogoSection>
    );
  };

  // Helper function to get admin info section
  const getAdminInfo = () => {
    if (!currentUser) return null;
    
    return (
      <AdminInfo>
        <AdminTitle>Nomu Cafe Admin</AdminTitle>
        <AdminName>{currentUser.fullName}</AdminName>
      </AdminInfo>
    );
  };

  // Navigation items configuration
  const navigationItems = [
    {
      to: "/admin/home",
      label: "Admin Dashboard",
      icon: <BarChart3 size={18} />,
      accessible: true
    },
    {
      to: "/admin/manage-admins",
      label: "Manage Admins",
      icon: <Users size={18} />,
      accessible: canAccessManageAdmins,
      restricted: !canAccessManageAdmins,
      tooltip: "Owner: full access. Manager: add Staff only, edit/reset own account only"
    },
    {
      to: "/admin/menu-management",
      label: "Menu Management",
      icon: <Coffee size={18} />,
      accessible: canAccessMenuManagement,
      restricted: !canAccessMenuManagement,
      tooltip: "Requires Manager or Owner access"
    },
    {
      to: "/admin/inventory-management",
      label: "Inventory Management",
      icon: <Package size={18} />,
      accessible: canAccessInventoryManagement,
      restricted: !canAccessInventoryManagement,
      tooltip: "Requires Manager or Owner access"
    },
    {
      to: "/admin/reward-management",
      label: "Reward Management",
      icon: <Gift size={18} />,
      accessible: true
    },
    {
      to: "/admin/promo-management",
      label: "Promo Management",
      icon: <Star size={18} />,
      accessible: true
    },
    {
      to: "/admin/customer-feedback",
      label: "Customer Feedback",
      icon: <MessageSquare size={18} />,
      accessible: true
    },
    {
      to: "/admin/gallery-management",
      label: "Gallery Management",
      icon: <Grid3X3 size={18} />,
      accessible: canAccessGalleryManagement,
      restricted: !canAccessGalleryManagement,
      tooltip: "Requires Manager or Owner access"
    }
  ];

  // Show mobile redirect if on mobile device
  if (shouldShowMobileRedirect) {
    return <MobileRedirect />;
  }

  return (
    <Page>
      <Sidebar>
        <Shade>
          {getLogoSection()}
          <nav style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
            {navigationItems.map((item, index) => (
              <NavItemContainer key={index}>
                {item.accessible ? (
                  <NavItem to={item.to} end>
                    <NavIcon>{item.icon}</NavIcon>
                    {item.label}
                  </NavItem>
                ) : (
                  <NavItem 
                    className={`locked`}
                    onClick={(e) => e.preventDefault()}
                  >
                    <NavIcon>{item.icon}</NavIcon>
                    <NavLabel>{item.label}</NavLabel>
                    <LockIcon>
                      <Lock size={14} strokeWidth={2} />
                    </LockIcon>
                    <Tooltip className="tooltip">
                      {item.tooltip}
                    </Tooltip>
                  </NavItem>
                )}
              </NavItemContainer>
            ))}
            
            {/* Mobile Barista Application — APK hosted on same site as customer app */}
            <DownloadButton 
              href={DOWNLOAD_BARISTA_APK_URL}
              download="Nomu-Barista-Application.apk"
              title="Download Barista App (APK)"
            >
              <NavIcon>
                <Smartphone size={18} />
              </NavIcon>
              Download Barista App
            </DownloadButton>
          </nav>
          <div style={{marginTop: 'auto'}}>
            {getAdminInfo()}
            <LogoutButton onClick={() => setShowLogoutConfirm(true)}>
              <NavIcon>
                <LogOut size={18} />
              </NavIcon>
              Logout
            </LogoutButton>
          </div>
        </Shade>
      </Sidebar>
      
      <Main>
        <div className="admin-main-content">{children}</div>
      </Main>

      {showLogoutConfirm && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <style>
            {`
              .admin-modal .admin-btn-primary {
                background: white !important;
                color: #212c59 !important;
                border: 2px solid #212c59 !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1) !important;
                flex: 1 !important;
                font-size: 0.95rem !important;
              }
              .admin-modal .admin-btn-primary:hover {
                background: #212c59 !important;
                border-color: #212c59 !important;
                color: white !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3) !important;
              }
            `}
          </style>
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideIn 0.3s ease-out',
              transform: 'scale(1)',
              boxShadow: '0 15px 50px rgba(0, 0, 0, 0.2)', // STANDARDIZED SHADOW
              background: '#f8f9fa',
              borderRadius: '16px', // STANDARDIZED BORDER RADIUS
              width: '92%', // STANDARDIZED WIDTH
              maxWidth: '550px', // STANDARDIZED MAX WIDTH
              maxHeight: 'calc(100vh - 30px)', // STANDARDIZED HEIGHT
              padding: '28px' // STANDARDIZED PADDING
            }}
          >
            <div style={{ 
              position: 'relative', 
              textAlign: 'center', 
              marginBottom: '24px', // STANDARDIZED MARGIN
              padding: '0 0 18px 0', // STANDARDIZED PADDING
              borderRadius: '16px 16px 0 0', // STANDARDIZED BORDER RADIUS
              borderBottom: '1px solid #e9ecef'
            }}>
              <h3 style={{ 
                margin: '0', 
                color: '#212c59', 
                fontSize: '1.25rem', // STANDARDIZED FONT SIZE 
                fontWeight: '700',
                fontFamily: "'Montserrat', sans-serif"
              }}>Confirm Logout</h3>
            </div>
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px' }}>
              Are you sure you want to log out?
            </div>
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="admin-btn admin-btn-primary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
};

export default AdminLayout;
