import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import SignInForm from '../client/SignInForm';
import NomuLogo from '../utils/Images/Logo.png';
import { isRestrictedAdminDevice } from './utils/deviceAccess';

const MOBILE_BREAKPOINT = 768;

/* Single-column layout: mobile sign-in design adapted for desktop admin */
const Page = styled.div`
  width: 100vw;
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Montserrat', sans-serif;
  animation: pageIn 0.4s ease-out;
  @keyframes pageIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 40px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  box-sizing: border-box;
`;

/* Circular logo: same as mobile – dark blue circle with logo, centered above the form */
const LogoContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 32px;
  margin-top: 0;
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
  /* No filter – match mobile: logo shows in original colors on dark blue circle */
`;


/* Form wrapper: same visual language as mobile sign-in (clean inputs, dark blue primary) */
const FormContainer = styled.div`
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
  .form label input {
    width: 100% !important;
    margin-top: 6px !important;
    padding: 12px 16px !important;
    font-size: 16px !important;
    height: 48px !important;
    border: 1px solid #dddfe2 !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    box-sizing: border-box !important;
  }
  .form label input:focus {
    border-color: #212c59 !important;
    outline: none !important;
  }
  .form .password-wrapper {
    width: 100% !important;
    margin-top: 6px !important;
  }
  .form .password-wrapper input {
    width: 100% !important;
    padding-right: 48px !important;
  }
  .form button[type="submit"] {
    width: 100% !important;
    background: #212c59 !important;
    color: white !important;
    border: 2px solid #212c59 !important;
    border-radius: 8px !important;
    padding: 12px 0 !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    height: 48px !important;
    margin-top: 20px !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
  }
  .form button[type="submit"]:hover:not(:disabled) {
    background: #1a2447 !important;
    border-color: #1a2447 !important;
  }
  .form button[type="submit"]:disabled {
    opacity: 0.6 !important;
    cursor: not-allowed !important;
  }
  .options-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    margin-top: 4px !important;
    margin-bottom: 16px !important;
    width: 100% !important;
  }
  .remember-group input[type="checkbox"] {
    width: 16px !important;
    height: 16px !important;
    accent-color: #212c59 !important;
    cursor: pointer !important;
  }
  .remember-text {
    color: #212c59 !important;
    font-size: 14px !important;
    font-weight: 500 !important;
  }
  .forgot-password-link {
    background: none !important;
    border: none !important;
    color: #212c59 !important;
    font-size: 14px !important;
    text-decoration: underline !important;
    cursor: pointer !important;
  }
  .forgot-password-link:hover {
    color: #5B86E5 !important;
  }
  .form-footer {
    display: none !important;
  }
  .forgot-password-below {
    margin-top: 32px !important;
    text-align: center !important;
    width: 100% !important;
  }
  .form-error {
    background: #f8d7da !important;
    color: #721c24 !important;
    padding: 12px 16px !important;
    border-radius: 8px !important;
    margin-bottom: 16px !important;
    font-size: 14px !important;
  }
`;

/* Mobile-only: desktop-only message */
const MobileBlock = styled.div`
  display: none;
  width: 100vw;
  min-height: 100vh;
  background: #212c59;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
  @media (max-width: ${MOBILE_BREAKPOINT}px) {
    display: flex;
  }
`;

const MobileTitle = styled.h1`
  color: #ffffff;
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
`;

const MobileMessage = styled.p`
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
  max-width: 300px;
`;

const MobileLink = styled(Link)`
  color: #98C7ED;
  text-decoration: none;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
`;

/**
 * Admin-only login at /login.
 * Single-column layout matching the mobile sign-in design, for desktop.
 */
const AdminLogin = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(() => isRestrictedAdminDevice());

  useEffect(() => {
    const check = () => setIsMobile(isRestrictedAdminDevice());
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        if (!isRestrictedAdminDevice() && (user.role === 'superadmin' || user.role === 'manager' || user.role === 'staff')) {
          navigate('/admin/home', { replace: true });
        }
      } catch (_) {}
    }
  }, [navigate]);

  const handleSuccess = () => {
    navigate('/admin/home', { replace: true });
  };

  if (isMobile) {
    return (
      <MobileBlock>
        <MobileTitle>Admin access is for desktop only</MobileTitle>
        <MobileMessage>
          Sign in from a computer or laptop to access the admin dashboard.
        </MobileMessage>
        <MobileLink to="/">← Back to Nomu Cafe</MobileLink>
      </MobileBlock>
    );
  }

  return (
    <Page>
      <Main>
        <LogoContainer>
          <CircularLogo src={NomuLogo} alt="Nomu Cafe" />
        </LogoContainer>
        <FormContainer>
          <SignInForm
            showSignUpLink={false}
            hideFormTitle={true}
            preventRedirect={true}
            onSubmit={handleSuccess}
            forAdminLogin={true}
          />
        </FormContainer>
      </Main>
    </Page>
  );
};

export default AdminLogin;
