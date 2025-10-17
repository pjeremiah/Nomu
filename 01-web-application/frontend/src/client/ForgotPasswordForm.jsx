import React, { useState, useEffect, useRef } from 'react';

// Function to mask email address for security
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(1, localPart.length - 1));
  
  return `${maskedLocal}@${domain}`;
};

const ForgotPasswordForm = ({ onBack }) => {
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef(null);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
    setInvalidFields((prev) => prev.filter((field) => field !== id));
    setError('');
  };

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

  const requestOTP = async () => {
    if (resendCooldown > 0) {
      return; // Prevent multiple requests during cooldown
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset code');
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
      // Check if the error is specifically about email not being registered
      if (error.message && error.message.includes('No account found with this email address')) {
        setError('The email address is not registered');
      } else {
        setError(error.message || 'Failed to send reset code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email) => {
    const validDomains = ['@gmail.com'];
    return validDomains.some(domain => email.toLowerCase().endsWith(domain));
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!showOTPForm) {
      // First step: Request password reset OTP
      if (!formData.email) {
        setInvalidFields(['email']);
        setError('Please enter your email address');
        setIsLoading(false);
        return;
      }
      
      if (!validateEmail(formData.email)) {
        setInvalidFields(['email']);
        setError('Please use a valid Gmail address');
        setIsLoading(false);
        return;
      }
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to send reset code');
        }
        
        if (data.requiresOTP && data.userType === 'password_reset') {
          // Show OTP form
          setShowOTPForm(true);
          setOtpSent(true);
          setOtpExpiresAt(data.expiresAt);
          setError('');
          
          // Start 25-second cooldown timer for initial OTP
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
        } else {
          // Handle unexpected response format
          console.error('Unexpected response format:', data);
          setError('Unexpected response from server. Please try again.');
        }
      } catch (error) {
        // Check if the error is specifically about email not being registered
        if (error.message && error.message.includes('No account found with this email address')) {
          setError('The email address is not registered');
        } else {
          setError(error.message || 'Failed to send reset code');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // Second step: Verify OTP and reset password
      if (!formData.otp || formData.otp.length !== 6) {
        setError('Please enter a valid 6-digit verification code');
        setIsLoading(false);
        return;
      }
      
      if (!formData.newPassword) {
        setInvalidFields(['newPassword']);
        setError('Please enter a new password');
        setIsLoading(false);
        return;
      }
      
      if (!validatePassword(formData.newPassword)) {
        setInvalidFields(['newPassword']);
        setError('Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*(),.?":{}|<>)');
        setIsLoading(false);
        return;
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setInvalidFields(['newPassword', 'confirmPassword']);
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: formData.email, 
            otp: formData.otp,
            newPassword: formData.newPassword
          }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Password reset failed');
        }
        
        // Password reset successful
        alert('Password reset successfully! You can now sign in with your new password.');
        onBack();
      } catch (error) {

        setError(error.message || 'Password reset failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const goBackToEmail = () => {
    setShowOTPForm(false);
    setOtpSent(false);
    setOtpExpiresAt(null);
    setFormData({ ...formData, otp: '', newPassword: '', confirmPassword: '' });
    setError('');
  };

  const inputStyle = (field) => invalidFields.includes(field)
    ? { border: '1.5px solid red', background: '#fff' }
    : {};



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
        .password-wrapper input {
          width: 100%;
          padding-right: 40px;
        }
        .back-to-email-button {
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
        .back-to-email-button:hover:not(:disabled) {
          background: #f8f6f0 !important;
          border-color: #b08d57 !important;
          color: #b08d57 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
        }
        .back-to-email-button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
      `}</style>

      <form className="form" onSubmit={handleSubmit}>
        {!showOTPForm ? (
          <>
            <h2>Forgot Password</h2>
            {error && (
              <div className="form-error">{error}</div>
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
                placeholder="Enter your Gmail address"
              />
            </label>
            
            <button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div className="form-footer">
              Remember your password?{' '}
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className="form-switch-button"
              >
                Sign In
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Reset Password</h2>
            {error && (
              <div className="form-error">{error}</div>
            )}
            {otpSent && (
              <div className="form-success">
                <strong>📧 Reset Code Sent!</strong><br />
                A 6-digit reset code has been sent to <strong>{maskEmail(formData.email)}</strong>
                {otpExpiresAt && (
                  <div className="expiry-time">
                    Code expires at: {new Date(otpExpiresAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
            
            <label htmlFor="otp">
              Verification Code
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
            </label>
            
            <label htmlFor="newPassword">
              New Password
              <div className="password-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  style={inputStyle('newPassword')}
                  placeholder="Enter new password"
                />
                <span 
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.06 10.06 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 014.22-5.53"/>
                      <path d="M22.54 6.88A21.6 21.6 0 0123 12s-4 7-11 7a10.06 10.06 0 01-5.94-1.94"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </span>
              </div>
            </label>
            
            <label htmlFor="confirmPassword">
              Confirm New Password
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  style={inputStyle('confirmPassword')}
                  placeholder="Confirm new password"
                />
                <span 
                  className="eye-icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={0}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.06 10.06 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 014.22-5.53"/>
                      <path d="M22.54 6.88A21.6 21.6 0 0123 12s-4 7-11 7a10.06 10.06 0 01-5.94-1.94"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </span>
              </div>
            </label>
            
            <button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <div className="form-footer">
              <button
                type="button"
                onClick={goBackToEmail}
                disabled={isLoading}
                className="back-to-email-button"
              >
                Back to Email
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default ForgotPasswordForm;
