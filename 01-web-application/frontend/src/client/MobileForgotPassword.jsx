import React from 'react';
import styled from 'styled-components';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { MenuRounded, CloseRounded } from '@mui/icons-material';
import { FaMobileAlt } from 'react-icons/fa';
import LogoImg from '../utils/Images/Logo.png';
import ForgotPasswordForm from './ForgotPasswordForm';
import { useAuth } from '../contexts/AuthContext';

const MobileForgotPasswordContainer = styled.div`
  min-height: 100vh;
  width: 100vw;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  padding-top: 80px;
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  z-index: 1000;
  animation: fadeInSlide 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  
  @keyframes fadeInSlide {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @media (max-width: 768px) {
    padding: 20px 16px;
    padding-top: 80px;
  }
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const BurgerIconButton = styled.button`
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1001;
  background: transparent;
  border: 1px solid #212c59;
  color: #212c59;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
  
  &:hover {
    background: rgba(33, 44, 89, 0.1);
  }
  
  &:active {
    background: rgba(33, 44, 89, 0.2);
  }
`;

const SidebarBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1002;
  opacity: ${({ $isOpen }) => ($isOpen ? '1' : '0')};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.3s ease;
`;

const MobileSidebar = styled.div`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 80%;
  max-width: 300px;
  height: 100vh;
  z-index: 1003;
  background: linear-gradient(135deg, rgba(33, 44, 89, 0.95) 0%, rgba(33, 44, 89, 0.9) 100%);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
  transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0%)' : 'translateX(-100%)')};
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
  overflow-y: auto;
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

const SidebarNavLink = styled(RouterLink)`
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

const MobileAppIcon = styled.a`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: auto;
  padding: 12px 16px;
  border-radius: 8px;
  color: white;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 32px;
  margin-top: 20px;
  
  @media (max-width: 768px) {
    margin-bottom: 24px;
    margin-top: 10px;
  }
`;

const CircularLogo = styled.img`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: contain;
  background: #212c59;
  padding: 20px;
  box-sizing: border-box;
  box-shadow: 0 4px 12px rgba(33, 44, 89, 0.15);
  
  @media (max-width: 768px) {
    width: 100px;
    height: 100px;
    padding: 16px;
  }
`;

const FormWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledForgotPasswordForm = styled.div`
  width: 100%;
  
  .form {
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
    display: flex !important;
    flex-direction: column !important;
  }
  
  .form h2 {
    display: none !important;
  }
  
  .form input {
    width: 100% !important;
    max-width: 100% !important;
    margin-bottom: 12px !important;
    border-radius: 8px !important;
    padding: 12px 16px !important;
    font-size: 16px !important;
    height: 48px !important;
    border: 1px solid #dddfe2 !important;
    background: #ffffff !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    box-sizing: border-box !important;
  }
  
  .form label {
    display: flex !important;
    flex-direction: column !important;
    width: 100% !important;
    margin-bottom: 12px !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    color: #212c59 !important;
    font-family: 'Montserrat', sans-serif !important;
  }
  
  /* Remove ALL glow effects from submit button - Match Sign In button styling */
  .form button[type="submit"],
  button[type="submit"],
  form button[type="submit"],
  .form button[type="submit"]:hover,
  button[type="submit"]:hover,
  form button[type="submit"]:hover,
  .form button[type="submit"]:focus,
  button[type="submit"]:focus,
  form button[type="submit"]:focus,
  .form button[type="submit"]:active,
  button[type="submit"]:active,
  form button[type="submit"]:active {
    width: 100% !important;
    background: white !important;
    color: #212c59 !important;
    border: 2px solid #212c59 !important;
    border-radius: 8px !important;
    padding: 12px 0 !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    height: 48px !important;
    min-height: 48px !important;
    max-height: 48px !important;
    margin-top: 16px !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-sizing: border-box !important;
    box-shadow: none !important;
    outline: none !important;
    text-shadow: none !important;
    filter: none !important;
    transform: none !important;
    -webkit-box-shadow: none !important;
    -moz-box-shadow: none !important;
    -webkit-filter: none !important;
    -moz-filter: none !important;
  }
  
  .form button[type="submit"]:hover,
  button[type="submit"]:hover,
  form button[type="submit"]:hover {
    background: #212c59 !important;
    color: white !important;
    border-color: #1a2447 !important;
    box-shadow: none !important;
    -webkit-box-shadow: none !important;
    -moz-box-shadow: none !important;
    outline: none !important;
    text-shadow: none !important;
    filter: none !important;
    -webkit-filter: none !important;
    transform: none !important;
  }
  
  .form button[type="submit"]:active {
    background: #1a2447 !important;
    color: white !important;
    border-color: #1a2447 !important;
    box-shadow: none !important;
    outline: none !important;
    text-shadow: none !important;
    filter: none !important;
  }
  
  .form button[type="submit"]:focus {
    box-shadow: none !important;
    outline: none !important;
  }
  
  .form button[type="submit"]:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
    box-shadow: none !important;
    outline: none !important;
  }
  
  /* Hide form-footer in mobile */
  .form-footer {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
    pointer-events: none !important;
  }
  
  .form-footer * {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  
  .form-switch-button {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  
  .form-error {
    background: #f8d7da !important;
    color: #721c24 !important;
    padding: 12px 16px !important;
    border-radius: 8px !important;
    margin-bottom: 16px !important;
    font-size: 14px !important;
    text-align: center !important;
  }
  
  .form-success {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%) !important;
    color: #155724 !important;
    padding: 12px 16px !important;
    border-radius: 8px !important;
    margin-bottom: 16px !important;
    border: 1px solid #c3e6cb !important;
    font-size: 14px !important;
  }
  
  .password-wrapper {
    position: relative !important;
    width: 100% !important;
    margin-top: 6px !important;
  }
  
  .password-wrapper input {
    padding-right: 40px !important;
  }
`;

const RememberPasswordButton = styled.button`
  width: 100%;
  max-width: 400px;
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  border-radius: 8px;
  padding: 0;
  font-size: 16px;
  font-weight: 600;
  height: 48px;
  min-height: 48px;
  max-height: 48px;
  margin-top: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(176, 141, 87, 0.2);
  
  &:hover {
    background: #b08d57;
    color: white;
    border-color: #9a7a4a;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(176, 141, 87, 0.3);
  }
`;

const MobileForgotPassword = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Redirect if already authenticated or if on desktop
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }
    
    // Redirect to home if accessed on desktop (mobile pages are mobile-only)
    if (window.innerWidth > 768) {
      navigate('/');
      return;
    }
    
    const handleResize = () => {
      if (window.innerWidth > 768) {
        navigate('/');
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isAuthenticated, navigate]);

  // Handle body scroll lock when sidebar is open
  React.useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const handleHomeClick = (e) => {
    e.preventDefault();
    setIsSidebarOpen(false);
    navigate('/');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleForgotPasswordSuccess = () => {
    // After successful password reset, redirect to sign in
    navigate('/signin');
  };

  return (
    <>
      <MobileForgotPasswordContainer>
        <BurgerIconButton onClick={() => setIsSidebarOpen(true)}>
          <MenuRounded />
        </BurgerIconButton>
        
        <LogoContainer>
          <CircularLogo src={LogoImg} alt="Nomu Cafe Logo" />
        </LogoContainer>
        
        <FormWrapper>
          <StyledForgotPasswordForm>
            <ForgotPasswordForm 
              onBack={() => navigate('/signin')} 
            />
          </StyledForgotPasswordForm>
          
          <RememberPasswordButton onClick={() => navigate('/signin')}>
            Remember your password? Sign In
          </RememberPasswordButton>
        </FormWrapper>
      </MobileForgotPasswordContainer>

      {/* Sidebar Backdrop */}
      <SidebarBackdrop 
        $isOpen={isSidebarOpen} 
        onClick={() => setIsSidebarOpen(false)} 
      />

      {/* Mobile Sidebar */}
      <MobileSidebar $isOpen={isSidebarOpen}>
        <SidebarHeader>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <SidebarLogo 
              src={LogoImg} 
              alt="Logo" 
              onClick={handleHomeClick}
            />
            <SidebarText>Nomu Cafe</SidebarText>
          </div>
          <CloseButton onClick={() => setIsSidebarOpen(false)}>
            <CloseRounded />
          </CloseButton>
        </SidebarHeader>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '10px' }}>
          <SidebarNavLink to="/" onClick={(e) => { handleHomeClick(e); setIsSidebarOpen(false); }}>HOME</SidebarNavLink>
          <SidebarNavLink to="/aboutus" onClick={() => setIsSidebarOpen(false)}>ABOUT US</SidebarNavLink>
          <SidebarNavLink to="/menu" onClick={() => setIsSidebarOpen(false)}>MENU</SidebarNavLink>
          <SidebarNavLink to="/location" onClick={() => setIsSidebarOpen(false)}>LOCATION</SidebarNavLink>
          <SidebarNavLink to="/contactus" onClick={() => setIsSidebarOpen(false)}>CONTACT US</SidebarNavLink>
          <SidebarNavLink to="/gallery" onClick={() => setIsSidebarOpen(false)}>GALLERY</SidebarNavLink>
          <MobileAppIcon 
            href="https://drive.google.com/drive/folders/1XJyZEK_KEOs-Ew8n_mjpR_T-fW_ro2T1?usp=sharing" 
            target="_blank"
            title="Download Customer App"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaMobileAlt style={{ marginRight: '8px' }} />
            Download Customer App
          </MobileAppIcon>
        </div>

        {!isAuthenticated && (
          <div style={{ flexShrink: 0, paddingTop: '20px', paddingBottom: '40px' }}>
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                navigate('/signin');
              }}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '25px',
                padding: '10px 24px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, rgba(200, 200, 200, 0.3), rgba(150, 150, 150, 0.4))';
                e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.5)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.border = '2px solid rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Sign In
            </button>
          </div>
        )}
      </MobileSidebar>
    </>
  );
};

export default MobileForgotPassword;
