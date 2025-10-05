import React, { useState, useEffect, useRef } from 'react';
import EnhancedGenderDropdown from './components/EnhancedGenderDropdown';
import SuccessModal from '../components/SuccessModal';

// Function to mask email address for security
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(1, localPart.length - 1));
  
  return `${maskedLocal}@${domain}`;
};

const SignUpForm = ({ onSubmit, onSwitch, onOTPStateChange }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    birthday: '',
    gender: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invalidFields, setInvalidFields] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const timerRef = useRef(null);

  // Ensure birthday is always in YYYY-MM-DD format
  useEffect(() => {
    if (formData.birthday && formData.birthday.includes('/')) {
      // Convert from MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD
      const date = new Date(formData.birthday);
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, birthday: formattedDate }));
      }
    }
  }, [formData.birthday]);

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

  // Notify parent when OTP form state changes
  useEffect(() => {
    if (onOTPStateChange) {
      onOTPStateChange(showOTPForm);
    }
  }, [showOTPForm, onOTPStateChange]);

  const handleChange = (e) => {
    const { id, value, name } = e.target;
    
    // Special handling for birthday to ensure YYYY-MM-DD format
    let processedValue = value;
    if (id === 'birthday' && value) {
      // Ensure the date is in YYYY-MM-DD format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        processedValue = date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    }
    
    if (name === 'gender') {
      setFormData({ ...formData, gender: value });
      setInvalidFields((prev) => prev.filter((field) => field !== 'gender'));
    } else {
      setFormData({ ...formData, [id]: processedValue });
      setInvalidFields((prev) => prev.filter((field) => field !== id));
    }
    setError('');
  };

  const requestOTP = async () => {
    if (resendCooldown > 0) {
      return; // Prevent multiple requests during cooldown
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          birthday: formData.birthday,
          gender: formData.gender,
          password: formData.password
        }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
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
      setError(error.message || 'Failed to send verification code');
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
      // First step: Validate form and request OTP
      let invalid = [];
      if (!formData.fullName) invalid.push('fullName');
      if (!formData.username) invalid.push('username');
      if (!formData.email) invalid.push('email');
      if (!formData.birthday) invalid.push('birthday');
      if (!formData.gender) invalid.push('gender');
      if (!formData.password) invalid.push('password');
      if (!formData.confirmPassword) invalid.push('confirmPassword');
      if (invalid.length > 0) {
        setInvalidFields(invalid);
        setError('Please fill up all blanks');
        setIsLoading(false);
        return;
      }
      if (!validateEmail(formData.email)) {
        setInvalidFields(['email']);
        setError('Please use a valid email address');
        setIsLoading(false);
        return;
      }
      if (!validatePassword(formData.password)) {
        setInvalidFields(['password']);
        setError('Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*(),.?":{}|<>)');
        setIsLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setInvalidFields(['password', 'confirmPassword']);
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      
      // Validate birthday
      if (!formData.birthday) {
        setInvalidFields(['birthday']);
        setError('Please select your birthday');
        setIsLoading(false);
        return;
      }
      
      // Validate age - must be at least 1 year old
      const birthday = new Date(formData.birthday);
      const today = new Date();
      const ageInYears = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      
      // Check if birthday has passed this year
      const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthday.getDate());
      const actualAge = hasBirthdayPassed ? ageInYears : ageInYears - 1;
      
      if (actualAge < 1) {
        setInvalidFields(['birthday']);
        setError('You must be at least 1 year old to create an account');
        setIsLoading(false);
        return;
      }
      
      const payload = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        birthday: formData.birthday,
        gender: formData.gender,
        password: formData.password,
      };
      
      try {

        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        const response = await fetch(`${API_URL}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        
        if (!response.ok) {
          throw new Error(data.message || 'Signup failed');
        }
        
        if (data.requiresOTP && data.userType === 'signup') {
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
          // Direct signup success (fallback)
          setFormData({
            fullName: '',
            username: '',
            email: '',
            birthday: '',
            gender: '',
            password: '',
            confirmPassword: '',
            otp: ''
          });
          setInvalidFields([]);
          alert('Signup successful!');
          onSubmit();
        }
      } catch (error) {

        setError(error.message || 'An error occurred during signup');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Second step: Verify OTP
      if (!formData.otp || formData.otp.length !== 6) {
        setError('Please enter a valid 6-digit verification code');
        setIsLoading(false);
        return;
      }
      
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
        const response = await fetch(`${API_URL}/api/auth/signup/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, otp: formData.otp }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'OTP verification failed');
        }
        
        // Signup successful
        setFormData({
          fullName: '',
          username: '',
          email: '',
          birthday: '',
          gender: '',
          password: '',
          confirmPassword: '',
          otp: ''
        });
        setInvalidFields([]);
        setShowOTPForm(false);
        setOtpSent(false);
        setOtpExpiresAt(null);
        setShowSuccessModal(true);
      } catch (error) {

        setError(error.message || 'OTP verification failed');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const goBackToSignup = () => {
    setShowOTPForm(false);
    setOtpSent(false);
    setOtpExpiresAt(null);
    setFormData({ ...formData, otp: '' });
    setError('');
  };

  const handleSuccessModalContinue = () => {
    setShowSuccessModal(false);
    onSwitch(); // Switch to sign in form
  };

  const inputStyle = (field) => invalidFields.includes(field)
    ? { border: '1.5px solid red', background: '#fff' }
    : {};

  const labelStyle = { width: '100%', fontWeight: 500, marginBottom: 2 };
  const fieldWrapper = { marginBottom: -8 };

  return (
    <div>
      <style>{`
        .form input::placeholder, .form select::placeholder {
          color: #a0a0a0;
          opacity: 1;
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
        .back-to-signup-button {
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
        .back-to-signup-button:hover:not(:disabled) {
          background: #f8f6f0 !important;
          border-color: #b08d57 !important;
          color: #b08d57 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
        }
        .back-to-signup-button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        .verification-code-input {
          width: 100% !important;
          box-sizing: border-box !important;
        }
      `}</style>

      <form className="form" onSubmit={handleSubmit} style={{ maxWidth: 450, margin: '0 auto', padding: 8 }}>
        {!showOTPForm ? (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Sign Up</h2>
            {error && (
              <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>
            )}
        
        <div style={fieldWrapper}>
          <label htmlFor="fullName" style={labelStyle}>Full Name</label>
          <input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            disabled={isLoading}
            style={{ ...inputStyle('fullName'), width: '100%' }}
            placeholder="Full name"
          />
        </div>

        <div style={fieldWrapper}>
          <label htmlFor="username" style={labelStyle}>Username</label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            disabled={isLoading}
            style={{ ...inputStyle('username'), width: '100%' }}
            placeholder="Username"
          />
        </div>

        <div style={fieldWrapper}>
          <label htmlFor="email" style={labelStyle}>Email Address</label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
            style={{ ...inputStyle('email'), width: '100%' }}
            placeholder="Email address"
          />
        </div>

        <div style={fieldWrapper}>
          <label htmlFor="birthday" style={labelStyle}>Birthday</label>
                     <input
             id="birthday"
             type="date"
             value={formData.birthday}
             onChange={handleChange}
             disabled={isLoading}
             style={{ 
               ...inputStyle('birthday'), 
               width: '100%',
               fontFamily: 'monospace',
               textAlign: 'left',
               direction: 'ltr'
             }}
             max={new Date().toISOString().split('T')[0]}
             min="1900-01-01"
             data-format="YYYY-MM-DD"
             placeholder="YYYY-MM-DD"
           />
        </div>

        <div style={fieldWrapper}>
          <label htmlFor="gender" style={labelStyle}>Gender</label>
          <EnhancedGenderDropdown
            value={formData.gender}
            onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
            disabled={isLoading}
          />
        </div>

        <div style={fieldWrapper}>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <div className="password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              minLength={8}
              style={{ ...inputStyle('password'), width: '100%' }}
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
        </div>

        <div style={fieldWrapper}>
          <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
          <div className="password-wrapper">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              minLength={8}
              style={{ ...inputStyle('confirmPassword'), width: '100%' }}
              placeholder="Confirm password"
            />
            <span
              className="eye-icon"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              tabIndex={0}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#232323" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.06 10.06 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 014.22-5.53"/><path d="M22.54 6.88A21.6 21.6 0 0123 12s-4 7-11 7a10.06 10.06 0 01-5.94-1.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              )}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Signing Up...' : 'Sign Up'}
        </button>

            <div className="form-footer">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitch}
                disabled={isLoading}
                className="form-switch-button"
              >
                Sign In
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 12 }}>Email Verification</h2>
            {error && (
              <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>
            )}
            {otpSent && (
              <div className="form-success">
                <strong>📧 Verification Code Sent!</strong><br />
                A 6-digit verification code has been sent to <strong>{maskEmail(formData.email)}</strong>
                {otpExpiresAt && (
                  <div className="expiry-time">
                    Code expires at: {new Date(otpExpiresAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
            <div style={fieldWrapper}>
              <label htmlFor="otp" style={labelStyle}>Verification Code</label>
              <div className="password-wrapper">
                <input
                  id="otp"
                  type="text"
                  value={formData.otp}
                  onChange={handleChange}
                  disabled={isLoading}
                  style={{ ...inputStyle('otp'), width: '100%', paddingRight: '75px' }}
                  className="verification-code-input"
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
            <button 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify & Create Account'}
            </button>
            
            <div className="form-footer">
              <button
                type="button"
                onClick={goBackToSignup}
                disabled={isLoading}
                className="back-to-signup-button"
              >
                Back to Signup
              </button>
            </div>
          </>
        )}
      </form>
      
      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal} 
        onContinue={handleSuccessModalContinue} 
      />
    </div>
  );
};

export default SignUpForm;
