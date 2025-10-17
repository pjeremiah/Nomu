import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import NavbarandFooterImg from '../../utils/Images/ForNavbarandFooter.jpg';
import NomuLogo from '../../utils/Images/Logo.png';
import { Lock, BarChart3, Users, Coffee, Gift, Star, MessageSquare, X, LogOut, Package, Smartphone, Grid3X3 } from 'lucide-react';
import { useModalContext } from '../context/ModalContext';
import useMobileDetection from '../hooks/useMobileDetection';
import MobileRedirect from '../components/MobileRedirect';

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
  width: 200px;
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
  padding: 6px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 12px;
  
  &.active, &:hover { 
    background: rgba(255,255,255,0.15); 
    transform: translateX(4px);
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  &.locked {
    opacity: 0.6;
    cursor: not-allowed;
    position: relative;
  }
  
  &.locked::after {
    content: '';
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const DownloadButton = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  padding: 6px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  
  &:hover { 
    background: rgba(255,255,255,0.2); 
    transform: translateX(4px);
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  padding: 6px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
  font-weight: 500;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  
  &:hover { 
    background: rgba(255,255,255,0.15); 
    transform: translateX(4px);
  }
  
  &:focus {
    outline: 2px solid rgba(255,255,255,0.3);
    outline-offset: 2px;
  }
  
  &:active {
    transform: translateX(2px);
  }
`;

const NavIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
`;

const LockIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: auto;
  opacity: 0.7;
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
  padding: 24px;
  margin-left: 200px; /* same width as sidebar */
`;

/* Fade In Animation - removed as it's not being used */



const AdminLayout = ({ children }) => {
  const { showLogoutConfirm, setShowLogoutConfirm } = useModalContext();
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('staff');
  const navigate = useNavigate();
  const { shouldShowMobileRedirect, isMobilePhone } = useMobileDetection();

  // Fetch current user info on component mount
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Check both localStorage and sessionStorage for token
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const API_URL = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
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
            // If authentication fails, clear old data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            navigate('/');
          }
        }
      } catch (error) {
        // If there's an error, clear old data and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        navigate('/');
      }
    };

    fetchUserInfo();
  }, [navigate]);

  // Heartbeat to keep admin status active
  useEffect(() => {
    if (!currentUser) return;

    const sendHeartbeat = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          const API_URL = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
          const response = await fetch(`${API_URL}/api/auth/heartbeat`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            // If token is invalid or expired, clear it and redirect to login
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              sessionStorage.removeItem('token');
              sessionStorage.removeItem('user');
              navigate('/');
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
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
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
      // Clear both localStorage and sessionStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      navigate('/');
    }
  };

  // Check if user can access restricted sections
  const canAccessManageAdmins = userRole === 'superadmin';
  const canAccessMenuManagement = userRole === 'superadmin' || userRole === 'manager';
  const canAccessInventoryManagement = userRole === 'superadmin' || userRole === 'manager';

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
      tooltip: "Requires Super Admin access"
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
      accessible: true
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
                  <NavItem to={item.to}>
                    <NavIcon>{item.icon}</NavIcon>
                    {item.label}
                  </NavItem>
                ) : (
                  <NavItem 
                    className={`locked`}
                    onClick={(e) => e.preventDefault()}
                  >
                    <NavIcon>{item.icon}</NavIcon>
                    {item.label}
                    <LockIcon>
                      <Lock size={14} />
                    </LockIcon>
                    <Tooltip className="tooltip">
                      {item.tooltip}
                    </Tooltip>
                  </NavItem>
                )}
              </NavItemContainer>
            ))}
            
            {/* Mobile Barista Application Download Button */}
            <DownloadButton 
              href="https://drive.google.com/drive/folders/15HsjfkjyfRN-ASEGXTDXNOJdYdFv9kGA?usp=sharing" 
              target="_blank"
              title="Download Barista App"
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
        {children}
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
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideIn 0.3s ease-out',
              transform: 'scale(1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ 
              position: 'relative', 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              borderRadius: '20px 20px 0 0',
              borderBottom: '2px solid rgba(33, 44, 89, 0.1)'
            }}>
              <h3 style={{ 
                margin: '0', 
                color: '#212c59', 
                fontSize: '1.5rem', 
                fontWeight: '700',
                fontFamily: "'Montserrat', sans-serif"
              }}>Confirm Logout</h3>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="modal-close-btn"
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '28px',
                  background: 'rgba(33, 44, 89, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: '#6c757d'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(33, 44, 89, 0.2)';
                  e.target.style.color = '#212c59';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(33, 44, 89, 0.1)';
                  e.target.style.color = '#6c757d';
                }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px' }}>
              Are you sure you want to log out?
            </div>
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="admin-btn admin-btn-secondary"
                style={{
                  background: 'white',
                  color: '#b08d57',
                  border: '2px solid #b08d57',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(176, 141, 87, 0.1)',
                  flex: '1',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8f6f0';
                  e.target.style.borderColor = '#b08d57';
                  e.target.style.color = '#b08d57';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(176, 141, 87, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#b08d57';
                  e.target.style.color = '#b08d57';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(176, 141, 87, 0.1)';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                ref={(el) => {
                  if (el) {
                    el.style.setProperty('background', 'white', 'important');
                    el.style.setProperty('color', '#212c59', 'important');
                    el.style.setProperty('border', '2px solid #212c59', 'important');
                    el.style.setProperty('border-color', '#212c59', 'important');
                  }
                }}
                style={{
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
                  flex: '1',
                  minWidth: '120px',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#212c59';
                  e.target.style.borderColor = '#212c59';
                  e.target.style.color = 'white';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(33, 44, 89, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#212c59';
                  e.target.style.color = '#212c59';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(33, 44, 89, 0.1)';
                }}
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
