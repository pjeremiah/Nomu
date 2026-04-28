import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Link as LinkR, NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import LogoImg from '../utils/Images/Logo.png';
import { MenuRounded, CloseRounded } from '@mui/icons-material';
import { FaTimes } from 'react-icons/fa';
import { X } from 'lucide-react';
import MobileAppModal from './MobileAppModal';
import { useAuth } from '../contexts/AuthContext';

// --- Hook ---
const MOBILE_BREAKPOINT = 768;
const COMPACT_NAV_BREAKPOINT = 1100;

const useWindowResize = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

const useCompactNav = () => {
  const [isCompactNav, setIsCompactNav] = useState(window.innerWidth <= COMPACT_NAV_BREAKPOINT);
  useEffect(() => {
    const handleResize = () => setIsCompactNav(window.innerWidth <= COMPACT_NAV_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isCompactNav;
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
  background: ${props => props.$isScrolled
    ? 'rgba(33, 44, 89, 0.95)'
    : 'transparent'
  };
  box-shadow: ${props => props.$isScrolled ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none'};

  /* Mobile: same as desktop - transparent at top, solid when scrolled (logo has drop-shadow for contrast over hero) */
  @media screen and (max-width: 768px) {
    background: ${props => props.$isScrolled
      ? 'rgba(33, 44, 89, 0.95)'
      : 'transparent'
    };
    box-shadow: ${props => props.$isScrolled ? '0 2px 10px rgba(0, 0, 0, 0.1)' : 'none'};
  }

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
  position: relative;
  
  @media screen and (max-width: ${COMPACT_NAV_BREAKPOINT}px) {
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
  flex-grow: 0;

  @media screen and (max-width: ${COMPACT_NAV_BREAKPOINT}px) {
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

  @media screen and (max-width: ${COMPACT_NAV_BREAKPOINT}px) {
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

  @media screen and (max-width: ${COMPACT_NAV_BREAKPOINT}px) {
    margin: 0 auto;
  }
`;

const Logo = styled.img`
  height: 50px;
  /* Mobile only: ensure logo stands out over dark gallery/modal background */
  @media screen and (max-width: 768px) {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }
`;

const NavItems = styled.ul`
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  list-style: none;
  gap: 24px;
  margin: 0;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;

  @media screen and (max-width: 1300px) {
    gap: 14px;
  }

  @media screen and (max-width: ${COMPACT_NAV_BREAKPOINT}px) {
    display: none;
  }
`;

const StyledNavLink = styled(RouterNavLink)`
  color: ${props => props.$isScrolled
    ? 'white'
    : (props.theme.isDarkMode ? props.theme.text_primary : 'white')
  };
  font-weight: 500;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.3s ease;
  text-shadow: none;
  white-space: nowrap;

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
  background: ${props => props.$isScrolled
    ? 'rgba(255, 255, 255, 0.1)' 
    : 'rgba(255, 255, 255, 0.01)'
  };
  border: ${props => props.$isScrolled
    ? '1px solid white' 
    : '1px solid rgba(255, 255, 255, 0.05)'
  };
  color: white;
  display: none;
  padding: 8px;
  border-radius: 8px;
  text-shadow: none;
  transition: all 0.3s ease;

  @media screen and (max-width: ${COMPACT_NAV_BREAKPOINT}px) {
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
  background: linear-gradient(135deg, rgba(33, 44, 89, 0.95) 0%, rgba(33, 44, 89, 0.9) 100%);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0%)' : 'translateX(-100%)')};
  transition: transform 0.3s ease;
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
  cursor: pointer;
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
  display: block;

  &:hover {
    color: #98C7ED;
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(8px);
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
  animation: ${props => props.$isClosing ? 'modalFadeOut 0.3s ease-out' : 'modalFadeIn 0.3s ease-out'} !important;
  will-change: opacity;

  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modalFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
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
  animation: ${props => props.$isClosing ? 'none' : 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'};
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
  border: 2px solid #212c59;
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
    border-color: #212c59;
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
  animation: ${props => props.$isClosing ? 'slideDown 0.3s ease forwards' : 'slideUp 0.3s ease forwards'};

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(100%);
    }
  }
`;

const DropdownBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.4);
  z-index: 2000;
  animation: ${props => props.$isClosing ? 'fadeOut 0.3s ease forwards' : 'fadeIn 0.3s ease forwards'};

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

const DragHandle = styled.div`
  width: 36px;
  height: 5px;
  background: #ccc;
  border-radius: 3px;
  margin: 0 auto 12px auto;
`;

// Desktop Logout Confirm Modal (Original Style)
const DesktopLogoutConfirmBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const DesktopLogoutConfirmModal = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1);
  animation: slideIn 0.3s ease-out;
  transform: scale(1);
  max-width: 600px;
  width: 65%;
  min-width: 400px;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const DesktopLogoutConfirmHeader = styled.div`
  position: relative;
  text-align: center;
  margin-bottom: 20px;
  padding: 50px 28px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 20px 20px 0 0;
  border-bottom: 2px solid rgba(33, 44, 89, 0.1);
`;

const DesktopLogoutConfirmTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #212c59;
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  text-align: center;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 1px;
    background: #212c59;
    border-radius: 1px;
  }
`;

const DesktopLogoutConfirmMessage = styled.p`
  text-align: center;
  margin: 0 0 30px 0;
  color: #666;
  font-size: 1rem;
  padding: 0 24px;
`;

const DesktopLogoutConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 0 24px 32px 24px;
`;

const DesktopCancelButton = styled.button`
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1);
  flex: 1;
  min-width: 120px;

  &:hover {
    background: #b08d57;
    border-color: #9a7a4a;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const DesktopLogoutButton = styled.button`
  background: white;
  color: #212c59;
  border: 2px solid #212c59;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1);
  flex: 1;
  min-width: 120px;

  &:hover {
    background: #212c59;
    color: white;
    border-color: #1a2347;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

// Mobile Logout Confirm Modal (Bottom Sheet Style)
const MobileLogoutConfirmBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 10000;
  animation: ${props => props.$isClosing ? 'fadeOut 0.3s ease forwards' : 'fadeIn 0.3s ease forwards'};

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileLogoutConfirmModal = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  background: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.25);
  z-index: 10001;
  padding: 24px;
  animation: ${props => props.$isClosing ? 'slideDown 0.3s ease forwards' : 'slideUp 0.3s ease forwards'};
  max-height: 50vh;

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(100%);
    }
  }

  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileLogoutConfirmDragHandle = styled.div`
  width: 40px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 0 auto 20px auto;
`;

const MobileLogoutConfirmTitle = styled.h3`
  margin: 0 0 1rem 0;
  color: #212c59;
  font-size: 1.3rem;
  font-weight: 700;
  font-family: 'Montserrat', sans-serif;
  text-align: center;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 1px;
    background: #212c59;
    border-radius: 1px;
  }
`;

const MobileLogoutConfirmMessage = styled.p`
  text-align: center;
  margin: 0 0 24px 0;
  color: #666;
  font-size: 1rem;
`;

const MobileLogoutConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  flex-direction: column;
`;

const MobileCancelButton = styled.button`
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  border-radius: 12px;
  padding: 14px 24px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1);
  flex: 1;
  min-width: 120px;

  &:hover {
    background: #b08d57;
    color: white;
    border-color: #9a7a4a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const MobileLogoutButton = styled.button`
  background: white;
  color: #212c59;
  border: 2px solid #212c59;
  border-radius: 12px;
  padding: 14px 24px;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1);
  flex: 1;
  min-width: 120px;

  &:hover {
    background: #212c59;
    color: white;
    border-color: #1a2347;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

// --- Component ---
const Navbar = () => {
  const isMobile = useWindowResize();
  const isCompactNav = useCompactNav();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showMobileAppModal, setShowMobileAppModal] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isMountedRef = useRef(false);
  
  // Use global auth context
  const { isAuthenticated, user } = useAuth();
  // Only show avatar/dropdown for admin users; client side has no customer sign-in
  const isAdminUser = user && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff');
  const showAccountUi = isAuthenticated && isAdminUser;
  
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
  
  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
  // Get avatar URL from global auth context
  const getAvatarUrl = () => {
    if (user && user.profilePicture) {
      // Handle both full URLs and relative paths
      if (user.profilePicture.startsWith('http')) {
        return user.profilePicture;
      } else if (user.profilePicture.startsWith('/api/')) {
        return `${API_URL}${user.profilePicture}`;
      } else {
        return `${API_URL}${user.profilePicture}`;
      }
    }
    return '';
  };
  const [imageLoadError, setImageLoadError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDropdownClosing, setIsDropdownClosing] = useState(false);
  const [isLogoutConfirmClosing, setIsLogoutConfirmClosing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchEndY, setTouchEndY] = useState(null);

  // No need for local auth state management - using global auth context

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

  const closeDropdownWithAnimation = () => {
    if (isMobile && showDropdown) {
      setIsDropdownClosing(true);
      setTimeout(() => {
        setShowDropdown(false);
        setIsDropdownClosing(false);
      }, 300);
    } else {
      setShowDropdown(false);
    }
  };

  const handleToggleDropdown = () => {
    if (showDropdown) {
      closeDropdownWithAnimation();
    } else {
      setShowDropdown(true);
    }
  };

  const closeLogoutConfirmWithAnimation = () => {
    if (isMobile && showLogoutConfirm) {
      setIsLogoutConfirmClosing(true);
      setTimeout(() => {
        setShowLogoutConfirm(false);
        setIsLogoutConfirmClosing(false);
      }, 300);
    } else {
      setShowLogoutConfirm(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    closeDropdownWithAnimation();
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // If admin, call logout API to set status to inactive
      if (token && user && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff')) {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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
      // No need to update local auth state - using global auth context
      setShowDropdown(false);
      setShowLogoutConfirm(false);
      window.dispatchEvent(new Event('authChange'));
      window.location.href = '/';
    }
  };

  const handleDropdownClick = () => {
    handleToggleDropdown();
  };

  const handleTouchStart = (e) => setTouchStartY(e.targetTouches[0].clientY);
  const handleTouchMove = (e) => setTouchEndY(e.targetTouches[0].clientY);
  const handleTouchEnd = () => {
    if (touchStartY !== null && touchEndY !== null && touchEndY - touchStartY > 100) {
      closeDropdownWithAnimation();
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
    <Nav $isScrolled={isScrolled}>
      <NavContainer>
        <NavLeft>
          <MobileIcon $isScrolled={isScrolled} onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
            <MenuRounded />
          </MobileIcon>
          <NavLogo to="/" onClick={handleLogoClick}>
            <Logo src={LogoImg} alt="Nomu Cafe Logo" />
          </NavLogo>
          {!isCompactNav && (
            <NavItems>
              <StyledNavLink to="/" $isScrolled={isScrolled} onClick={handleHomeClick}>HOME</StyledNavLink>
              <StyledNavLink to="/aboutus" $isScrolled={isScrolled}>ABOUT US</StyledNavLink>
              <StyledNavLink to="/menu" $isScrolled={isScrolled}>MENU</StyledNavLink>
              <StyledNavLink to="/location" $isScrolled={isScrolled}>LOCATION</StyledNavLink>
              <StyledNavLink to="/contactus" $isScrolled={isScrolled}>CONTACT US</StyledNavLink>
              <StyledNavLink to="/gallery" $isScrolled={isScrolled}>GALLERY</StyledNavLink>
              <StyledNavLink to="/nomu-app" $isScrolled={isScrolled}>NOMU APP</StyledNavLink>
            </NavItems>
          )}
        </NavLeft>

        <NavRight>
          <ButtonContainer>
            {showAccountUi ? (
              <IconButton onClick={handleDropdownClick}>
                {getAvatarUrl() && !imageLoadError ? (
                  <img 
                    src={getAvatarUrl()} 
                    alt="avatar" 
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} 
                    onError={(e) => {
                      console.error('Navbar - Image failed to load:', getAvatarUrl());
                      setImageLoadError(true);
                    }}
                    onLoad={() => {
                      setImageLoadError(false);
                    }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#003466', fontWeight: 700 }}>
                    {(() => {
                      if (user) {
                        const name = user.fullName || user.username || 'U';
                        return String(name).trim().charAt(0).toUpperCase() || 'U';
                      }
                      return 'U';
                    })()}
                  </div>
                )}
              </IconButton>
            ) : null}
          </ButtonContainer>
        </NavRight>
      </NavContainer>

      {/* Mobile App Modal */}
      {isMountedRef.current && showMobileAppModal && (
        <MobileAppModal 
          isOpen={showMobileAppModal} 
          onContinue={() => setShowMobileAppModal(false)} 
        />
      )}

      {/* Mobile Dropdown Modal */}
      {(showDropdown || isDropdownClosing) && isMobile && (
        <>
          <DropdownBackdrop 
            $isClosing={isDropdownClosing}
            onClick={closeDropdownWithAnimation} 
          />
          <DropdownModal
            $isClosing={isDropdownClosing}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <DragHandle />
            <button style={dropdownItemStyle} onClick={() => {
              closeDropdownWithAnimation();
              setTimeout(() => {
                handleLogoutClick();
              }, 300);
            }}>Sign Out</button>
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
          <button style={dropdownItemStyle} onClick={handleLogoutClick}>Sign Out</button>
        </div>
      )}

      <Backdrop $isOpen={isMobileSidebarOpen} $isScrolled={isScrolled} onClick={() => setIsMobileSidebarOpen(false)} />

      <MobileSidebar $isOpen={isMobileSidebarOpen} $isScrolled={isScrolled}>
        <SidebarHeader>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SidebarLogo src={LogoImg} alt="Logo" onClick={(e) => { handleLogoClick(e); setIsMobileSidebarOpen(false); }} />
          <SidebarText>Nomu Cafe</SidebarText>
          </div>
          <CloseButton onClick={() => setIsMobileSidebarOpen(false)}>
            <CloseRounded />
          </CloseButton>
        </SidebarHeader>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '10px' }}>
          <SidebarNavLink to="/" onClick={(e) => { handleHomeClick(e); setIsMobileSidebarOpen(false); }}>HOME</SidebarNavLink>
          <SidebarNavLink to="/aboutus" onClick={() => setIsMobileSidebarOpen(false)}>ABOUT US</SidebarNavLink>
          <SidebarNavLink to="/menu" onClick={() => setIsMobileSidebarOpen(false)}>MENU</SidebarNavLink>
          <SidebarNavLink to="/location" onClick={() => setIsMobileSidebarOpen(false)}>LOCATION</SidebarNavLink>
          <SidebarNavLink to="/contactus" onClick={() => setIsMobileSidebarOpen(false)}>CONTACT US</SidebarNavLink>
          <SidebarNavLink to="/gallery" onClick={() => setIsMobileSidebarOpen(false)}>GALLERY</SidebarNavLink>
          <SidebarNavLink to="/nomu-app" onClick={() => setIsMobileSidebarOpen(false)}>NOMU APP</SidebarNavLink>
        </div>

      </MobileSidebar>
    </Nav>

    {/* Logout Confirmation Modal - Desktop (Original Style) */}
    {showLogoutConfirm && !isMobile && (
      <DesktopLogoutConfirmBackdrop onClick={() => setShowLogoutConfirm(false)}>
        <DesktopLogoutConfirmModal onClick={(e) => e.stopPropagation()}>
          <DesktopLogoutConfirmHeader>
            <DesktopLogoutConfirmTitle>Confirm Logout</DesktopLogoutConfirmTitle>
          </DesktopLogoutConfirmHeader>
          <DesktopLogoutConfirmMessage>Are you sure you want to log out?</DesktopLogoutConfirmMessage>
          <DesktopLogoutConfirmActions>
            <DesktopCancelButton
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
            >
              Cancel
            </DesktopCancelButton>
            <DesktopLogoutButton
              type="button"
              onClick={handleLogout}
            >
              Logout
            </DesktopLogoutButton>
          </DesktopLogoutConfirmActions>
        </DesktopLogoutConfirmModal>
      </DesktopLogoutConfirmBackdrop>
    )}

    {/* Logout Confirmation Modal - Mobile (Bottom Sheet Style) */}
    {(showLogoutConfirm || isLogoutConfirmClosing) && isMobile && (
      <>
        <MobileLogoutConfirmBackdrop 
          $isClosing={isLogoutConfirmClosing}
          onClick={closeLogoutConfirmWithAnimation} 
        />
        <MobileLogoutConfirmModal 
          $isClosing={isLogoutConfirmClosing}
          onClick={(e) => e.stopPropagation()}
        >
          <MobileLogoutConfirmDragHandle />
          <MobileLogoutConfirmTitle>Confirm Logout</MobileLogoutConfirmTitle>
          <MobileLogoutConfirmMessage>Are you sure you want to log out?</MobileLogoutConfirmMessage>
          <MobileLogoutConfirmActions>
            <MobileLogoutButton
              type="button"
              onClick={handleLogout}
            >
              Logout
            </MobileLogoutButton>
            <MobileCancelButton
              type="button"
              onClick={closeLogoutConfirmWithAnimation}
            >
              Cancel
            </MobileCancelButton>
          </MobileLogoutConfirmActions>
        </MobileLogoutConfirmModal>
      </>
    )}
    </>
  );
};

export default Navbar;
