import React, { useState, useEffect, useRef } from 'react';
import ForgotPasswordForm from './ForgotPasswordForm';

// Function to mask email address for security
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(1, localPart.length - 1));
  
  return `${maskedLocal}@${domain}`;
};

const SignInForm = ({ onSubmit, onSwitch, onOTPStateChange }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberFor30Days, setRememberFor30Days] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef(null);

  // Notify parent when OTP form state changes
  useEffect(() => {
    if (onOTPStateChange) {
      onOTPStateChange(showOTPForm);
    }
  }, [showOTPForm, onOTPStateChange]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      // Clear any running timers when component unmounts
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Check for existing "Remember Me" preference on component mount
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    const savedRememberFor30Days = localStorage.getItem('rememberFor30Days');
    if (savedRememberMe === 'true') {
      setRememberMe(true);
    }
    if (savedRememberFor30Days === 'true') {
      setRememberFor30Days(true);
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setError(''); // Clear error when user types
    setInvalidFields((prev) => prev.filter((field) => field !== e.target.id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!showOTPForm) {
      // First step: Check if admin login requires OTP
      let invalid = [];
      if (!formData.email) invalid.push('email');
      if (!formData.password) invalid.push('password');
      if (invalid.length > 0) {
        setInvalidFields(invalid);
        setError('Invalid email or password');
        setIsLoading(false);
        return;
      }
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        const response = await fetch(`${API_URL}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Sign in failed');
        }
        
        if (data.requiresOTP && data.userType === 'admin') {
          // Admin login requires OTP - automatically request it
          setShowOTPForm(true);
          await requestOTP();
          // Note: requestOTP() already handles the cooldown timer
        } else if (data.userType === 'admin' || (data.user && data.user.role && ['superadmin', 'manager', 'staff'].includes(data.user.role))) {
          // Admin login successful (no OTP required - rememberUntil is still valid)
          
          if (rememberFor30Days) {
            // Store in localStorage for persistent login (30 days)
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberFor30Days', 'true');
          } else if (rememberMe) {
            // Store in localStorage for regular remember me
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('rememberMe', 'true');
            localStorage.removeItem('rememberFor30Days');
          } else {
            // Store in sessionStorage for session-only login
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberFor30Days');
          }
          window.location.href = '/admin/home';
          onSubmit && onSubmit();
        } else {
          // Customer login successful
          
          if (rememberMe) {
            // Store in localStorage for persistent login
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('rememberMe', 'true');
            localStorage.removeItem('rememberFor30Days');
          } else {
            // Store in sessionStorage for session-only login
            sessionStorage.setItem('token', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberFor30Days');
          }
          window.location.href = '/';
          onSubmit && onSubmit();
        }
      } catch (error) {

        setError(error.message || 'Sign in failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Second step: Verify OTP
      if (!formData.otp || formData.otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP code');
        setIsLoading(false);
        return;
      }
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        const response = await fetch(`${API_URL}/api/auth/admin/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            otp: formData.otp, 
            rememberFor30Days: rememberFor30Days 
          }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'OTP verification failed');
        }
        
        // Admin login successful
        if (rememberFor30Days) {
          // Store in localStorage for persistent login (30 days)
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberFor30Days', 'true');
        } else if (rememberMe) {
          // Store in localStorage for regular remember me
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('rememberMe', 'true');
          localStorage.removeItem('rememberFor30Days');
        } else {
          // Store in sessionStorage for session-only login
          sessionStorage.setItem('token', data.token);
          sessionStorage.setItem('user', JSON.stringify(data.user));
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberFor30Days');
        }
        window.location.href = '/admin/home';
        onSubmit && onSubmit();
      } catch (error) {

        setError(error.message || 'OTP verification failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const requestOTP = async () => {
    if (resendCooldown > 0) {
      return; // Prevent multiple requests during cooldown
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
      const response = await fetch(`${API_URL}/api/auth/admin/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      setOtpExpiresAt(data.expiresAt);
      setError('');
      
      // Start 25-second cooldown timer
      setResendCooldown(25);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      timerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setError(error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToLogin = () => {
    setShowOTPForm(false);
    setOtpSent(false);
    setOtpExpiresAt(null);
    setFormData({ ...formData, otp: '' });
    setError('');
  };

  const inputStyle = (field) => invalidFields.includes(field) ? { border: '1.5px solid red' } : {};

  // Show forgot password form if requested
  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div>
      <style>{`
        .form input::placeholder {
          color: #a0a0a0;
          opacity: 1;
        }
        .form input {
          font-size: 13px;
          padding: 8px 12px;
          height: 36px !important;
          box-sizing: border-box;
          line-height: 1.2;
          vertical-align: top;
          display: flex;
          align-items: center;
          border: 1px solid #e9ecef !important;
          border-radius: 10px !important;
          border-top: 1px solid #e9ecef !important;
          border-right: 1px solid #e9ecef !important;
          border-bottom: 2px solid #e9ecef !important;
          border-left: 1px solid #e9ecef !important;
          outline: none !important;
        }
        .password-wrapper {
          position: relative;
        }
        .eye-icon {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          width: 18px;
          height: 18px;
          fill: #5a6c7d;
          opacity: 0.7;
          transition: all 0.3s ease;
        }
        .eye-icon:hover {
          opacity: 1;
          fill: #212c59;
        }
        .form-success {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          color: #155724;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid #c3e6cb;
          box-shadow: 0 2px 8px rgba(21, 87, 36, 0.1);
        }
        .expiry-time {
          font-size: 12px;
          margin-top: 4px;
          color: #5a6c7d;
          text-align: center;
        }
        .back-to-login-button {
          background: white !important;
          color: #b08d57 !important;
          border: 2px solid #b08d57 !important;
          padding: 14px 24px !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          width: 100% !important;
          font-size: 16px !important;
          height: 48px !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1) !important;
        }
        .back-to-login-button:hover:not(:disabled) {
          background: #f8f6f0 !important;
          border-color: #b08d57 !important;
          color: #b08d57 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
        }
        .back-to-login-button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        .resend-code-button:hover:not(:disabled) {
          background: #138496 !important;
        }
        .resend-code-button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        .form-switch-button:hover {
          color: #5B86E5 !important;
          background: rgba(91, 134, 229, 0.1) !important;
          text-decoration: none !important;
        }
        .remember-group {
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        
        .options-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 16px !important;
        }
        
        .forgot-password-link {
          background: none !important;
          border: none !important;
          color: #212c59 !important;
          cursor: pointer !important;
          font-size: 13px !important;
          text-decoration: underline !important;
          padding: 0 !important;
          margin: 0 !important;
          font-family: 'Montserrat', sans-serif !important;
        }
        
        .forgot-password-link:hover {
          color: #5B86E5 !important;
          text-decoration: none !important;
        }
        
        .form-switch-button {
          color: #212c59 !important;
          background: none !important;
          border: none !important;
          cursor: pointer !important;
          font-family: 'Montserrat', sans-serif !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          padding: 0 !important;
          margin: 0 !important;
          transition: all 0.3s ease !important;
        }
        
        .form-switch-button:hover {
          color: #5B86E5 !important;
          background: rgba(91, 134, 229, 0.1) !important;
          text-decoration: none !important;
        }
        
        .form-footer {
          text-align: center !important;
          margin-top: 8px !important;
          font-size: 13px !important;
          color: #666 !important;
        }
        .remember-group input[type="checkbox"] {
          margin: 0 !important;
          vertical-align: middle !important;
        }
        .remember-text {
          cursor: default !important;
          user-select: none !important;
          color: #212c59 !important;
          font-size: 13px !important;
          margin: 0 !important;
          line-height: 1 !important;
          vertical-align: middle !important;
        }
        
        @media (max-width: 768px) {
          .form {
            max-width: 100% !important;
            padding: 10px !important;
            margin: 0 auto !important;
            max-height: 82vh !important;
            overflow-y: auto !important;
          }
          
          .form h2 {
            font-size: 1.1rem !important;
            margin-bottom: 4px !important;
          }
          
          .form input {
            font-size: 13px !important;
            padding: 8px 12px !important;
            height: 36px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
            border: 1px solid #e9ecef !important;
            border-radius: 10px !important;
            border-top: 1px solid #e9ecef !important;
            border-right: 1px solid #e9ecef !important;
            border-bottom: 2px solid #e9ecef !important;
            border-left: 1px solid #e9ecef !important;
            outline: none !important;
          }
          
          .form label {
            font-size: 10.5px !important;
            margin-bottom: 2px !important;
          }
          
          .form button {
            height: 36px !important;
            font-size: 14px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
          }
          
          .options-row {
            flex-wrap: nowrap !important;
            gap: 8px !important;
          }
          
          .remember-group {
            flex-shrink: 0 !important;
          }
          
          .forgot-password-link {
            font-size: 11px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          
          .form-footer {
            font-size: 11px !important;
            white-space: nowrap !important;
          }
        }
        
        @media (max-width: 480px) {
          .form {
            max-width: 100% !important;
            padding: 8px !important;
            margin: 0 auto !important;
            max-height: 86vh !important;
            overflow-y: auto !important;
          }
          
          .form h2 {
            font-size: 1.05rem !important;
            margin-bottom: 4px !important;
          }
          
          .form input {
            padding: 8px 12px !important;
            height: 36px !important;
            font-size: 13px !important;
            border: 1px solid #e9ecef !important;
            border-radius: 10px !important;
            border-top: 1px solid #e9ecef !important;
            border-right: 1px solid #e9ecef !important;
            border-bottom: 2px solid #e9ecef !important;
            border-left: 1px solid #e9ecef !important;
            outline: none !important;
          }
          
          .form label {
            font-size: 10.5px !important;
            margin-bottom: 2px !important;
          }
          
          .form button {
            height: 36px !important;
            font-size: 14px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
          }
          
          .options-row {
            flex-wrap: nowrap !important;
            gap: 6px !important;
          }
          
          .remember-group {
            flex-shrink: 0 !important;
          }
          
          .forgot-password-link {
            font-size: 10px !important;
            white-space: nowrap !important;
            flex-shrink: 0 !important;
          }
          
          .form-footer {
            font-size: 10px !important;
            white-space: nowrap !important;
          }
        }
      `}</style>
      <form className="form" onSubmit={handleSubmit} style={{ 
        maxWidth: 400, 
        margin: '0 auto', 
        padding: 24,
        width: '100%',
        boxSizing: 'border-box',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {!showOTPForm ? (
          <>
            <h2>Sign In</h2>
            {error && (
              <div className="form-error">
                {error}
              </div>
            )}
            <label htmlFor="email">
              Email Address
              <input 
                id="email" 
                type="email" 
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                style={inputStyle('email')}
                placeholder="Email address"
              />
            </label>
            <label htmlFor="password">
              Password
              <div className="password-wrapper">
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  style={{...inputStyle('password'), width: '100%'}} 
                  placeholder="Password"
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 014.22-5.53"/><path d="M22.54 6.88A21.6 21.6 0 0123 12s-4 7-11 7a10.06 10.06 0 01-5.94-1.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  )}
                </span>
              </div>
            </label>
            <div className="options-row">
              <div className="remember-group">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="remember-text">Remember Me</span>
              </div>
              <button 
                type="button" 
                className="forgot-password-link"
                onClick={() => setShowForgotPassword(true)}
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </div>
            <button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
            <div className="form-footer">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitch}
                disabled={isLoading}
                className="form-switch-button"
              >
                Sign Up
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Admin Verification</h2>
            {error && (
              <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>
            )}
            {otpSent && (
              <div className="form-success">
                <strong>📧 OTP Sent!</strong><br />
                A 6-digit verification code has been sent to <strong>{maskEmail(formData.email)}</strong>
                {otpExpiresAt && (
                  <div className="expiry-time">
                    Code expires at: {new Date(otpExpiresAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
            <div style={{ marginBottom: -12 }}>
              <label htmlFor="otp" style={{ width: '100%', fontWeight: 500, marginBottom: 4 }}>Verification Code</label>
              <div className="password-wrapper">
                <input
                  id="otp"
                  type="text"
                  value={formData.otp}
                  onChange={handleChange}
                  disabled={isLoading}
                  style={{ ...inputStyle('otp'), width: '100%', paddingRight: '75px' }}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                />
                <button
                  type="button"
                  onClick={requestOTP}
                  disabled={isLoading || resendCooldown > 0}
                  className="resend-code-button"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '55%',
                    transform: 'translateY(-50%)',
                    background: resendCooldown > 0 ? '#6c757d' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '60px',
                    lineHeight: '1',
                    margin: '0',
                    boxSizing: 'border-box'
                  }}
                >
                  {isLoading ? 'Sending...' : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                </button>
              </div>
            </div>
            <div className="remember-group" style={{ marginBottom: '24px', marginTop: '8px', justifyContent: 'flex-start' }}>
              <input
                id="rememberFor30Days"
                type="checkbox"
                checked={rememberFor30Days}
                onChange={(e) => setRememberFor30Days(e.target.checked)}
                disabled={isLoading}
              />
              <span className="remember-text">Remember this account for 30 days</span>
            </div>
            <button 
              type="submit"
              disabled={isLoading}
              style={{ marginBottom: '1px' }}
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>

            <div className="form-footer" style={{ marginTop: '0' }}>
              <button
                type="button"
                onClick={goBackToLogin}
                disabled={isLoading}
                className="back-to-login-button"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default SignInForm;
  