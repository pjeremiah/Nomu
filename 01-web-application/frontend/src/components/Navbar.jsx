import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Link as LinkR, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import LogoImg from '../utils/Images/Logo.png';
import { MenuRounded, CloseRounded } from '@mui/icons-material';
import { FaTimes, FaMobileAlt } from 'react-icons/fa';
import { X } from 'lucide-react';
import SignInForm from '../client/SignInForm'; 
import SignUpForm from '../client/SignUpForm';
import MobileAppModal from './MobileAppModal';

// --- Hook ---
const useWindowResize = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

const dropdownItemStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 16px',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  color: '#212c59',
  transition: 'background 0.2s ease',
  whiteSpace: 'nowrap',
};

// --- Styled Components ---
const Nav = styled.div`
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  transition: all 0.3s ease;
  background: ${props => props.$isScrolled || props.$isAccountSettings
    ? 'rgba(33, 44, 89, 0.95)'
    : 'transparent'
  };
  box-shadow: ${props => props.$isScrolled || props.$isAccountSettings ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none'};

  > * {
    position: relative;
    z-index: 1;
  }
`;

const NavContainer = styled.div`
  width: 100%;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  @media screen and (max-width: 768px) {
    padding: 0 16px;
  }
  
  @media screen and (max-width: 480px) {
    padding: 0 12px;
  }
`;

const NavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  flex-grow: 1;

  @media screen and (max-width: 768px) {
    justify-content: center;
    gap: 0;
    position: relative;
    flex: 1;
    min-width: 0;
  }
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;

  @media screen and (max-width: 768px) {
    position: absolute;
    right: 10px;
    flex-shrink: 0;
  }
  
  @media screen and (max-width: 480px) {
    right: 5px;
    gap: 16px;
  }
`;

const NavLogo = styled(LinkR)`
  display: flex;
  align-items: center;
  padding: 0 6px;
  font-weight: 500;
  font-size: 18px;
  text-decoration: none;
  color: inherit;

  @media screen and (max-width: 768px) {
    margin: 0 auto;
  }
`;

const Logo = styled.img`
  height: 50px;
`;

const MobileAppIcon = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border-radius: 50%;
  color: white;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: -12px;
  
  &:hover {
    color: #4A90E2;
    transform: translateY(-2px);
  }
  
  svg {
    font-size: 18px;
  }
  
  @media screen and (max-width: 768px) {
    width: 36px;
    height: 36px;
    margin-left: -11px;
    
    svg {
      font-size: 16px;
    }
  }
`;

const NavItems = styled.ul`
  display: flex;
  align-items: center;
  list-style: none;
  gap: 24px;
  margin: 0;

  @media screen and (max-width: 768px) {
    display: none;
  }
`;

const StyledNavLink = styled(RouterNavLink)`
  color: ${props => props.$isScrolled || props.$isAccountSettings
    ? 'white'
    : (props.theme.isDarkMode ? props.theme.text_primary : 'white')
  };
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  text-shadow: none;

  &:hover {
    color: #98C7ED;
  }

  &.active {
    color: #98C7ED;
    border-bottom: 1.8px solid #98C7ED;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const MobileIcon = styled.button`
  background: ${props => props.$isScrolled || props.$isAccountSettings
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(255, 255, 255, 0.01)'
  };
  border: ${props => props.$isScrolled || props.$isAccountSettings
    ? '1px solid white' 
    : '1px solid rgba(255, 255, 255, 0.05)'
  };
  color: white;
  display: none;
  padding: 8px;
  border-radius: 8px;
  text-shadow: none;
  transition: all 0.3s ease;

  @media screen and (max-width: 768px) {
    display: flex;
    align-items: center;
    cursor: pointer;
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
  }

  &:hover {
    background-color: ${props => props.$isScrolled 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(255, 255, 255, 0.05)'
    };
    border-color: white;
  }
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
`;

const SignInButton = styled.button`
  background: ${props => props.$isScrolled 
    ? 'linear-gradient(135deg, #212c59 0%, #2a3a6b 100%)' 
    : 'rgba(255, 255, 255, 0.02)'
  };
  color: white;
  border: ${props => props.$isScrolled 
    ? '2px solid #b08d57' 
    : '2px solid rgba(176, 141, 87, 0.1)'
  };
  border-radius: 25px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: ${props => props.$isScrolled 
    ? '0 1px 4px rgba(33, 44, 89, 0.15)' 
    : 'none'
  };
  position: relative;


  &:hover {
    background: ${props => props.$isScrolled 
      ? 'linear-gradient(135deg, #b08d57 0%, #c49d67 100%)' 
      : 'rgba(255, 255, 255, 0.2)'
    };
    border-color: white;
    color: white;
    transform: translateY(-1px);
    box-shadow: ${props => props.$isScrolled 
      ? '0 2px 6px rgba(176, 141, 87, 0.2)' 
      : '0 1px 3px rgba(0, 0, 0, 0.1)'
    };
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${props => props.$isScrolled 
      ? '0 1px 3px rgba(33, 44, 89, 0.15)' 
      : 'none'
    };
  }
`;


const SidebarBase = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 80%;
  max-width: 300px;
  height: 100vh;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  transition: transform 0.35s ease-in-out;
  overflow-y: hidden;
`;

const MobileSidebar = styled(SidebarBase)`
  left: 0;
  background: ${props => props.$isScrolled 
    ? 'linear-gradient(135deg, rgba(33, 44, 89, 0.95) 0%, rgba(33, 44, 89, 0.9) 100%)'
    : 'linear-gradient(135deg, rgba(33, 44, 89, 0.85) 0%, rgba(33, 44, 89, 0.8) 100%)'
  };
  backdrop-filter: ${props => props.$isScrolled ? 'blur(20px)' : 'blur(5px)'};
  border-right: ${props => props.$isScrolled 
    ? '1px solid rgba(255, 255, 255, 0.1)'
    : '1px solid rgba(255, 255, 255, 0.05)'
  };
  box-shadow: ${props => props.$isScrolled 
    ? '4px 0 20px rgba(0, 0, 0, 0.3)'
    : '4px 0 10px rgba(0, 0, 0, 0.1)'
  };
  transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0%)' : 'translateX(-100%)')};
  transition: all 0.3s ease;
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
`;

const SidebarLogo = styled.img`
  height: 50px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
`;

const SidebarText = styled.span`
  font-size: 24px;
  font-weight: 600;
  margin-left: 12px;
  color: white;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.6);
  letter-spacing: 0.5px;
`;

const CloseButton = styled.div`
  color: white;
  cursor: pointer;
  font-size: 28px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  
  &:hover {
    background: rgba(255, 255, 255, 0.25);
    border-color: rgba(255, 255, 255, 0.5);
    transform: scale(1.05);
  }
`;

const Divider = styled.hr`
  width: 100%;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  margin: 1.5rem 0;
`;

const SidebarNavLink = styled(RouterNavLink)`
  color: white;
  font-size: 16px;
  margin-bottom: 0.8rem;
  text-decoration: none;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.6);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  &:hover {
    color: #98C7ED;
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(8px);
    
    &::before {
      left: 100%;
    }
  }

  &.active {
    color: #98C7ED;
  }
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: ${props => props.$isScrolled 
    ? 'rgba(33, 44, 89, 0.8)'
    : 'rgba(33, 44, 89, 0.3)'
  };
  backdrop-filter: ${props => props.$isScrolled ? 'blur(8px)' : 'blur(3px)'};
  z-index: 1000;
  opacity: ${({ $isOpen }) => ($isOpen ? '1' : '0')};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
`;

const ModalBackdrop = styled.div`
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(8px) !important;
  z-index: 2000 !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  animation: modalFadeIn 0.3s ease-out !important;

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(8px);
    }
  }
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  padding: 2.5rem;
  border-radius: 20px;
  position: relative;
  max-width: 420px;
  width: 90%;
  box-shadow: 
    0 20px 60px rgba(33, 44, 89, 0.3),
    0 8px 25px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (max-width: 768px) {
    width: 96% !important;
    max-width: none !important;
    padding: 1rem !important;
    border-radius: 16px !important;
  }

  @media (max-width: 480px) {
    width: 98% !important;
    max-width: none !important;
    padding: 0.75rem !important;
    border-radius: 12px !important;
  }
`;

const CloseModalButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(33, 44, 89, 0.1);
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #212c59;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  font-weight: 600;
  
  &:hover {
    background: #212c59;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }
`;

const DropdownModal = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  background: #fff;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.25);
  z-index: 2001;
  padding: 20px;
  animation: slideUp 0.3s ease forwards;

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
`;

const DropdownBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.4);
  z-index: 2000;
  animation: fadeIn 0.3s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const DragHandle = styled.div`
  width: 36px;
  height: 5px;
  background: #ccc;
  border-radius: 3px;
  margin: 0 auto 12px auto;
`;

// --- Component ---
const Navbar = () => {
  const isMobile = useWindowResize();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showMobileAppModal, setShowMobileAppModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [isScrolled, setIsScrolled] = useState(false);
  const isMountedRef = useRef(false);
  
  // Initialize component and ensure modal is closed
  useEffect(() => {
    isMountedRef.current = true;
    setShowMobileAppModal(false);
  }, []);
  
  // Close mobile app modal when route changes
  useEffect(() => {
    setShowMobileAppModal(false);
  }, [location.pathname]);
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      setShowMobileAppModal(false);
    };
  }, []);

  // Handle body scroll lock when mobile sidebar is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Add CSS class to body
      document.body.classList.add('sidebar-open');
      
      // Prevent body scroll when sidebar is open
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Also prevent html scroll
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Remove CSS class from body
      document.body.classList.remove('sidebar-open');
      
      // Restore body scroll when sidebar is closed
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  // Handle Escape key to close mobile sidebar
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isMobileSidebarOpen) {
        setIsMobileSidebarOpen(false);
      }
    };

    if (isMobileSidebarOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isMobileSidebarOpen]);
  
  // Check if user is on account settings page
  const isAccountSettings = location.pathname === '/account-settings' || location.pathname === '/accountsettings';
  
  // Helper function to get token from either localStorage or sessionStorage
  const getToken = () => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());
  const [isOTPFormShowing, setIsOTPFormShowing] = useState(false);
  
  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
  
  const [avatarUrl, setAvatarUrl] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      if (u.profilePicture) {
        // Handle both full URLs and relative paths
        if (u.profilePicture.startsWith('http')) {
          return u.profilePicture;
        } else if (u.profilePicture.startsWith('/api/')) {
          return `${API_URL}${u.profilePicture}`;
        } else {
          return `${API_URL}${u.profilePicture}`;
        }
      }
      return '';
    } catch {
      return '';
    }
  });
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchEndY, setTouchEndY] = useState(null);

  useEffect(() => {
    const updateAuthStatus = () => {
      setIsLoggedIn(!!getToken());
      try {
        const userData = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
        const u = JSON.parse(userData);
        if (u.profilePicture) {
          // Handle both full URLs and relative paths
          let newAvatarUrl;
          if (u.profilePicture.startsWith('http')) {
            newAvatarUrl = u.profilePicture;
          } else if (u.profilePicture.startsWith('/api/')) {
            newAvatarUrl = `${API_URL}${u.profilePicture}`;
          } else {
            newAvatarUrl = `${API_URL}${u.profilePicture}`;
          }
          setAvatarUrl(newAvatarUrl);
          setImageLoadError(false); // Reset error state when URL changes
        } else {
          setAvatarUrl('');
          setImageLoadError(false);
        }
      } catch (error) {
        setAvatarUrl('');
      }
    };

    // Update immediately on mount
    updateAuthStatus();

    window.addEventListener('authChange', updateAuthStatus);
    return () => window.removeEventListener('authChange', updateAuthStatus);
  }, [API_URL]);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileSidebarOpen(false);
      setShowDropdown(false);
    }
  }, [isMobile]);

  // Scroll detection effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeModal = () => {
    setShowSignInModal(false);
    setAuthMode('signin');
    setIsLoggedIn(!!getToken());
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setShowDropdown(false);
  };

  // Ensure logout button has correct styling when modal opens
  useEffect(() => {
    if (showLogoutConfirm) {
      const logoutButton = document.querySelector('.logout-btn-custom');
      if (logoutButton) {
        logoutButton.style.setProperty('background', 'white', 'important');
        logoutButton.style.setProperty('color', '#212c59', 'important');
        logoutButton.style.setProperty('border', '2px solid #212c59', 'important');
        logoutButton.style.setProperty('box-shadow', '0 2px 8px rgba(33, 44, 89, 0.1)', 'important');
      }
    }
  }, [showLogoutConfirm]);

  const handleLogout = async () => {
    try {
      const token = getToken();
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
      const user = JSON.parse(userData);
      
      // If admin, call logout API to set status to inactive
      if (token && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff')) {
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {

    } finally {
      // Clear both localStorage and sessionStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setIsLoggedIn(false);
      setShowDropdown(false);
      setShowLogoutConfirm(false);
      window.dispatchEvent(new Event('authChange'));
      window.location.href = '/';
    }
  };

  const handleDropdownClick = () => {
    setShowDropdown(prev => !prev);
  };

  const handleTouchStart = (e) => setTouchStartY(e.targetTouches[0].clientY);
  const handleTouchMove = (e) => setTouchEndY(e.targetTouches[0].clientY);
  const handleTouchEnd = () => {
    if (touchStartY !== null && touchEndY !== null && touchEndY - touchStartY > 100) {
      setShowDropdown(false);
    }
    setTouchStartY(null);
    setTouchEndY(null);
  };

  // Function to handle home navigation and scroll to top
  const handleHomeClick = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // If already on home page, just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // If on different page, navigate to home and scroll to top
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  // Function to handle logo click
  const handleLogoClick = (e) => {
    e.preventDefault();
    if (location.pathname === '/') {
      // If already on home page, just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // If on different page, navigate to home and scroll to top
      navigate('/');
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <>
    <Nav 
      $isScrolled={isScrolled}
      $isAccountSettings={isAccountSettings}
    >
      <NavContainer>
        <NavLeft>
          <MobileIcon $isScrolled={isScrolled} $isAccountSettings={isAccountSettings} onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
            <MenuRounded />
          </MobileIcon>
          <NavLogo to="/" onClick={handleLogoClick}>
            <Logo src={LogoImg} alt="Nomu Cafe Logo" />
          </NavLogo>
          {!isMobile && (
            <NavItems>
              <StyledNavLink to="/" $isScrolled={isScrolled} $isAccountSettings={isAccountSettings} onClick={handleHomeClick}>HOME</StyledNavLink>
              <StyledNavLink to="/aboutus" $isScrolled={isScrolled} $isAccountSettings={isAccountSettings}>ABOUT US</StyledNavLink>
              <StyledNavLink to="/menu" $isScrolled={isScrolled} $isAccountSettings={isAccountSettings}>MENU</StyledNavLink>
              <StyledNavLink to="/location" $isScrolled={isScrolled} $isAccountSettings={isAccountSettings}>LOCATION</StyledNavLink>
              <StyledNavLink to="/contactus" $isScrolled={isScrolled} $isAccountSettings={isAccountSettings}>CONTACT US</StyledNavLink>
              <StyledNavLink to="/gallery" $isScrolled={isScrolled} $isAccountSettings={isAccountSettings}>GALLERY</StyledNavLink>
              <MobileAppIcon 
                href="https://drive.google.com/drive/folders/1XJyZEK_KEOs-Ew8n_mjpR_T-fW_ro2T1?usp=sharing" 
                target="_blank"
                title="Download Customer App"
              >
                <FaMobileAlt />
              </MobileAppIcon>
            </NavItems>
          )}
        </NavLeft>

        <NavRight>
          <ButtonContainer>
            {isLoggedIn ? (
              <IconButton onClick={handleDropdownClick}>
                {avatarUrl && !imageLoadError ? (
                  <img 
                    src={avatarUrl} 
                    alt="avatar" 
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} 
                    onError={(e) => {
                      console.error('Navbar - Image failed to load:', avatarUrl);
                      setImageLoadError(true);
                    }}
                    onLoad={() => {
                      setImageLoadError(false);
                    }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003466', fontWeight: 700 }}>
                    {(() => {
                      try {
                        const u = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                        const name = u.fullName || u.username || 'U';
                        return String(name).trim().charAt(0).toUpperCase() || 'U';
                      } catch { return 'U'; }
                    })()}
                  </div>
                )}
              </IconButton>
            ) : (
              !isMobile && (
                <SignInButton 
                  $isScrolled={isScrolled}
                  onClick={() => {
                    setShowSignInModal(true);
                    setAuthMode('signin');
                  }}
                >
                  Sign In
                </SignInButton>
              )
            )}
          </ButtonContainer>
        </NavRight>
      </NavContainer>

      {/* Sign In / Sign Up Modal */}
      {showSignInModal && (
        <ModalBackdrop>
          <ModalContent onClick={e => e.stopPropagation()}>
            {authMode === 'signin' ? (
              <SignInForm onSubmit={() => {
                closeModal();
                window.dispatchEvent(new Event('authChange'));
              }} onSwitch={() => setAuthMode('signup')} onOTPStateChange={setIsOTPFormShowing} />
            ) : (
              <SignUpForm onSubmit={() => {
                closeModal();
                window.dispatchEvent(new Event('authChange'));
              }} onSwitch={() => setAuthMode('signin')} onOTPStateChange={setIsOTPFormShowing} />
            )}
            {!isOTPFormShowing && (
              <CloseModalButton onClick={closeModal}>
                <FaTimes />
              </CloseModalButton>
            )}
          </ModalContent>
        </ModalBackdrop>
      )}

      {/* Mobile App Modal */}
      {isMountedRef.current && showMobileAppModal && (
        <MobileAppModal 
          isOpen={showMobileAppModal} 
          onContinue={() => setShowMobileAppModal(false)} 
        />
      )}

      {/* Mobile Dropdown Modal */}
      {showDropdown && isMobile && (
        <>
          <DropdownBackdrop />
          <DropdownModal
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <DragHandle />
            <button style={dropdownItemStyle} onClick={() => window.location.href = '/account-settings'}>
              Account Settings
            </button>
            <button style={dropdownItemStyle} onClick={handleLogoutClick}>Sign Out</button>
          </DropdownModal>
        </>
      )}

      {/* Desktop Dropdown */}
      {showDropdown && !isMobile && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '16px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '8px 0',
          minWidth: '160px',
          zIndex: 999,
        }}>
          <button style={dropdownItemStyle} onClick={() => window.location.href = '/account-settings'}>
            Account Settings
          </button>
          <button style={dropdownItemStyle} onClick={handleLogoutClick}>Sign Out</button>
        </div>
      )}

      <Backdrop $isOpen={isMobileSidebarOpen} $isScrolled={isScrolled} onClick={() => setIsMobileSidebarOpen(false)} />

      <MobileSidebar $isOpen={isMobileSidebarOpen} $isScrolled={isScrolled}>
        <SidebarHeader>
          <SidebarLogo src={LogoImg} alt="Logo" onClick={(e) => { handleLogoClick(e); setIsMobileSidebarOpen(false); }} style={{ cursor: 'pointer' }} />
          <SidebarText>Nomu Cafe</SidebarText>
          <CloseButton onClick={() => setIsMobileSidebarOpen(false)}>
            <CloseRounded />
          </CloseButton>
        </SidebarHeader>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '10px', maxHeight: '60vh' }}>
          <SidebarNavLink to="/" onClick={(e) => { handleHomeClick(e); setIsMobileSidebarOpen(false); }}>HOME</SidebarNavLink>
          <SidebarNavLink to="/aboutus" onClick={() => setIsMobileSidebarOpen(false)}>ABOUT US</SidebarNavLink>
          <SidebarNavLink to="/menu" onClick={() => setIsMobileSidebarOpen(false)}>MENU</SidebarNavLink>
          <SidebarNavLink to="/location" onClick={() => setIsMobileSidebarOpen(false)}>LOCATION</SidebarNavLink>
          <SidebarNavLink to="/contactus" onClick={() => setIsMobileSidebarOpen(false)}>CONTACT US</SidebarNavLink>
          <SidebarNavLink to="/gallery" onClick={() => setIsMobileSidebarOpen(false)}>GALLERY</SidebarNavLink>
          <MobileAppIcon 
            href="https://drive.google.com/drive/folders/1XJyZEK_KEOs-Ew8n_mjpR_T-fW_ro2T1?usp=sharing" 
            target="_blank"
            title="Download Customer App"
            style={{ margin: '0', width: '100%', height: 'auto', padding: '12px 16px', borderRadius: '8px', justifyContent: 'flex-start' }}
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <FaMobileAlt style={{ marginRight: '8px' }} />
            Download Customer App
          </MobileAppIcon>
        </div>

        {!isLoggedIn && (
          <div style={{ flexShrink: 0, paddingTop: '20px', paddingBottom: '40px' }}>
            <SignInButton 
              $isScrolled={isScrolled}
              onClick={() => {
                setIsMobileSidebarOpen(false);
                setShowSignInModal(true);
                setAuthMode('signin');
              }}
              style={{ width: '100%' }}
            >
              Sign In
            </SignInButton>
          </div>
        )}
      </MobileSidebar>
    </Nav>

    {/* Logout Confirmation Modal - Outside Nav for proper centering */}
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
              className="logout-btn-custom"
              style={{
                background: 'white !important',
                color: '#212c59 !important',
                border: '2px solid #212c59 !important',
                borderRadius: '12px',
                padding: '12px 24px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1) !important',
                backgroundColor: 'white !important',
                borderColor: '#212c59 !important',
                flex: '1',
                minWidth: '120px'
              }}
              onMouseEnter={(e) => {
                e.target.style.setProperty('background', 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUgMTJMMTAgMTdMMTkgOCIgc3Ryb2tlPSIjMjEyYzU5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K") no-repeat center center, linear-gradient(135deg, #212c59 0%, #2a3a6b 100%)', 'important');
                e.target.style.backgroundSize = '20px 20px, cover';
                e.target.style.setProperty('color', 'white', 'important');
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.setProperty('box-shadow', '0 6px 20px rgba(33, 44, 89, 0.4)', 'important');
              }}
              onMouseLeave={(e) => {
                e.target.style.setProperty('background', 'white', 'important');
                e.target.style.backgroundSize = 'auto';
                e.target.style.setProperty('color', '#212c59', 'important');
                e.target.style.setProperty('border', '2px solid #212c59', 'important');
                e.target.style.transform = 'translateY(0)';
                e.target.style.setProperty('box-shadow', '0 2px 8px rgba(33, 44, 89, 0.1)', 'important');
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Navbar;
