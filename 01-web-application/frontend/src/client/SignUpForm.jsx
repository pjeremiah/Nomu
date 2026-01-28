import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EnhancedGenderDropdown from './components/EnhancedGenderDropdown';
import SuccessModal from '../components/SuccessModal';

// Function to mask email address for security
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.charAt(0) + '*'.repeat(Math.max(1, localPart.length - 1));
  
  return `${maskedLocal}@${domain}`;
};

const SignUpForm = ({ onSubmit, onSwitch, onOTPStateChange, preventRedirect = false }) => {
  const { login } = useAuth();
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
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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
      
      // Validate age - must be at least 13 years old
      const birthday = new Date(formData.birthday);
      const today = new Date();
      const ageInYears = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      
      // Check if birthday has passed this year
      const hasBirthdayPassed = monthDiff > 0 || (monthDiff === 0 && today.getDate() >= birthday.getDate());
      const actualAge = hasBirthdayPassed ? ageInYears : ageInYears - 1;
      
      if (actualAge < 13) {
        setInvalidFields(['birthday']);
        setError('You must be at least 13 years old to create an account');
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

        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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
          // Update global auth state
          login(data.user);
          onSubmit(data.user);
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
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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

  const labelStyle = { 
    width: '100%', 
    fontWeight: 600, 
    marginBottom: '0.25rem', 
    fontSize: '14px',
    color: '#212c59',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    textAlign: 'left',
    paddingLeft: '0px',
    marginLeft: '0px'
  };
  const genderLabelStyle = { 
    width: '100%', 
    fontWeight: 600, 
    marginBottom: '0.25rem', 
    fontSize: '14px',
    color: '#212c59',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    textAlign: 'left',
    paddingLeft: '0px',
    marginLeft: '0px'
  };
  const fieldWrapper = { marginBottom: 6 };
  const twoColumnStyle = { 
    display: 'flex', 
    gap: '16px', 
    marginBottom: 6,
    alignItems: 'flex-start'
  };
  const halfWidthStyle = { 
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    minWidth: 0
  };

  return (
    <div className="signup-form">
      <style>{`
        /* Override global CSS rules */
        .signup-form .form input {
          margin-top: 6px !important;
          border: 1px solid #e9ecef !important;
          border-bottom: 2px solid #e9ecef !important;
        }
        .signup-form .form input::placeholder, .signup-form .form select::placeholder {
          color: #a0a0a0;
          opacity: 1;
        }
        .signup-form .form .two-column-mobile {
          display: flex !important;
          gap: 16px !important;
          align-items: flex-start !important;
          width: 100% !important;
        }
        .signup-form .form .half-width-container {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          width: 100%;
          flex: 1;
          min-width: 0;
        }
        .signup-form .form .half-width-container label {
          margin-left: 0;
          padding-left: 0;
          text-align: left;
          width: 100%;
        }
        .signup-form .form .half-width-container input,
        .signup-form .form .half-width-container .gender-dropdown {
          width: 100%;
          box-sizing: border-box;
        }
        .signup-form .form .half-width-container .gender-dropdown {
          margin-top: 0px;
          margin-bottom: 0;
          vertical-align: top;
        }
        .signup-form .form .half-width-container:first-child input {
          margin-top: 6px;
        }
        .signup-form .form input, .signup-form .form select, .signup-form .gender-dropdown button {
          font-size: 13px !important;
          padding: 8px 12px !important;
          height: 36px !important;
          box-sizing: border-box !important;
          line-height: 1.2 !important;
          vertical-align: top !important;
          display: flex !important;
          align-items: center !important;
          border: 1px solid #e9ecef !important;
          border-radius: 10px !important;
          border-top: 1px solid #e9ecef !important;
          border-right: 1px solid #e9ecef !important;
          border-bottom: 2px solid #e9ecef !important;
          border-left: 1px solid #e9ecef !important;
          outline: none !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          font-family: 'Montserrat', sans-serif !important;
        }
        .gender-dropdown {
          display: inline-block;
          vertical-align: middle;
          margin: 0;
          padding: 0;
        }
        .signup-form .form label {
          font-size: 14px;
          font-weight: 600;
          color: #212c59;
          margin-bottom: 0.25rem;
          display: flex;
          flex-direction: column;
          position: relative;
          text-align: left;
          padding-left: 0;
          margin-left: 0;
          width: 100%;
        }
        .form label[for="confirmPassword"] {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .form h2 {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .form button[type="submit"] {
          margin-top: 12px;
          padding: 8px 0;
          background: white;
          color: #212c59;
          border: 2px solid #212c59;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100% !important;
          min-width: 100% !important;
          max-width: 100% !important;
          height: 36px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: 'Montserrat', sans-serif;
          box-shadow: none;
          line-height: 1.2 !important;
          vertical-align: middle !important;
          box-sizing: border-box !important;
          position: relative !important;
          overflow: hidden !important;
          flex-shrink: 0 !important;
        }
        .form button[type="submit"]:hover {
          background: #212c59;
          color: white;
          border-color: #1a2447;
          transform: none;
          box-shadow: none;
        }
        .form button[type="submit"]:active {
          background: #1a2447;
          color: white;
          border-color: #1a2447;
          transform: none;
          box-shadow: none;
        }
        .form button[type="submit"]:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          background: white;
          color: #212c59;
          border-color: #212c59;
        }
        .form-switch-button {
          color: #212c59;
          background: none;
          border: none;
          cursor: pointer;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          padding: 0;
          margin: 0;
          transition: all 0.3s ease;
        }
        .form-switch-button:hover {
          color: #5B86E5;
          background: rgba(91, 134, 229, 0.1);
          text-decoration: none;
        }
        .form-switch-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-footer {
          text-align: center;
          margin-top: 8px;
          font-size: 13px;
          color: #666;
        }
        .password-wrapper {
          position: relative;
        }
        .eye-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          width: 16px;
          height: 16px;
          fill: #5a6c7d;
          opacity: 0.7;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .eye-icon:hover {
          opacity: 1;
          fill: #212c59;
        }
        .form-success {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          color: #155724;
          padding: 0 14px;
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #c3e6cb;
          box-shadow: 0 2px 8px rgba(21, 87, 36, 0.1);
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          line-height: 1.2;
          box-sizing: border-box;
          width: 100%;
          min-width: 100%;
          max-width: 100%;
          flex-shrink: 0;
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .form-success {
            padding: 12px 16px !important;
            text-align: center !important;
            justify-content: center !important;
            align-items: center !important;
            font-size: 14px !important;
            height: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
            display: flex !important;
            width: 100% !important;
            margin-bottom: 16px !important;
          }
          
          .form-success * {
            text-align: center !important;
            margin: 0 auto !important;
          }
        }
        
        @media (max-width: 480px) {
          .form-success {
            padding: 12px 16px !important;
            text-align: center !important;
            justify-content: center !important;
            align-items: center !important;
            font-size: 14px !important;
            height: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
            display: flex !important;
            width: 100% !important;
            margin-bottom: 16px !important;
          }
          
          .form-success * {
            text-align: center !important;
            margin: 0 auto !important;
          }
        }
        .expiry-time {
          display: none;
        }
        .back-to-signup-button {
          background: white !important;
          color: #212c59 !important;
          border: 2px solid #212c59 !important;
          padding: 8px 0 !important;
          border-radius: 10px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          width: 100% !important;
          font-size: 15px !important;
          height: 36px !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: none !important;
          margin-top: 12px !important;
        }
        .back-to-signup-button:hover:not(:disabled) {
          background: #212c59 !important;
          border-color: #1a2447 !important;
          color: white !important;
          transform: none !important;
          box-shadow: none !important;
        }
        
        @media (min-width: 769px) {
          .back-to-signup-button {
            background: white !important;
            color: #b08d57 !important;
            border: 2px solid #b08d57 !important;
            margin-top: 4px !important;
          }
          .back-to-signup-button:hover:not(:disabled) {
            background: #b08d57 !important;
            border-color: #9a7a4a !important;
            color: white !important;
          }
          .form-footer {
            margin-top: 4px !important;
          }
          .form button[type="submit"] {
            margin-bottom: 0 !important;
          }
          .resend-code-button {
            height: 24px !important;
            padding: 4px 8px !important;
            font-size: 11px !important;
            min-width: 55px !important;
            border-radius: 4px !important;
            top: 50% !important;
          }
        }
        .back-to-signup-button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        .password-wrapper input {
          width: 100%;
          padding-right: 40px;
        }
        
        @media (max-width: 768px) {
          .password-wrapper input[id="otp"] {
            padding: 12px 16px !important;
            padding-right: 75px !important;
            height: 48px !important;
            font-size: 16px !important;
            line-height: 1.2 !important;
            border: 1px solid #dddfe2 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            margin-bottom: 12px !important;
            box-sizing: border-box !important;
          }
          .form {
            max-width: 96% !important; /* fill sides more for mobile */
            padding: 10px !important;
            margin: 0 auto !important;
            max-height: 82vh !important;
            overflow-y: auto !important;
          }
          
          .form h2 {
            font-size: 1.1rem !important;
            margin-bottom: 4px !important;
          }
          
          .form input, .form select, .gender-dropdown button {
            font-size: 13px !important;
            padding: 8px 12px !important;
            height: 36px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
            display: flex !important;
            align-items: center !important;
          }
          
          .form input[id="otp"] {
            padding: 12px 16px !important;
            padding-right: 75px !important;
            height: 48px !important;
            font-size: 16px !important;
            line-height: 1.2 !important;
            border: 1px solid #dddfe2 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            margin-bottom: 12px !important;
            box-sizing: border-box !important;
          }
          .gender-dropdown {
            display: inline-block !important;
            vertical-align: middle !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .form label {
            font-size: 10.5px !important;
            margin-bottom: 2px !important;
            display: block !important;
            text-align: left !important;
            padding-left: 0 !important;
            margin-left: 0 !important;
            width: 100% !important;
          }
          .form label[for="confirmPassword"] {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          .form button[type="submit"] {
            height: 36px !important;
            font-size: 14px !important;
            padding: 8px 0 !important;
            margin-top: 10px !important;
            background: white !important;
            color: #212c59 !important;
            border: 2px solid #212c59 !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Montserrat', sans-serif !important;
            box-shadow: none !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
            position: relative !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
          }
          .form button[type="submit"]:hover {
            background: #212c59 !important;
            color: white !important;
            border-color: #1a2447 !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .form button[type="submit"]:active {
            background: #1a2447 !important;
            color: white !important;
            border-color: #1a2447 !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .form button[type="submit"]:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
            transform: none !important;
            background: white !important;
            color: #212c59 !important;
            border-color: #212c59 !important;
          }
          
          .form .two-column-mobile {
            display: flex !important;
            gap: 16px !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          .form .half-width-container {
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          /* Keep two-column layout on mobile for consistency with desktop */
        }
        
        @media (max-width: 480px) {
          .form {
            max-width: 98% !important;
            padding: 8px !important;
            margin: 0 auto !important;
            max-height: 86vh !important;
            overflow-y: auto !important;
          }
          
          .form .two-column-mobile {
            display: flex !important;
            gap: 16px !important;
            align-items: flex-start !important;
            width: 100% !important;
          }
          .form .half-width-container {
            flex: 1 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
          }
          
          .form h2 {
            font-size: 1.05rem !important;
            margin-bottom: 4px !important;
          }
          
          .signup-form .form input, .signup-form .form select, .signup-form .gender-dropdown button {
            padding: 8px 12px !important;
            height: 36px !important;
            font-size: 13px !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
            display: flex !important;
            align-items: center !important;
            border: 1px solid #e9ecef !important;
            border-radius: 10px !important;
            border-top: 1px solid #e9ecef !important;
            border-right: 1px solid #e9ecef !important;
            border-bottom: 2px solid #e9ecef !important;
            border-left: 1px solid #e9ecef !important;
            outline: none !important;
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            font-family: 'Montserrat', sans-serif !important;
          }
          
          .signup-form .form input[id="otp"],
          .password-wrapper input[id="otp"] {
            padding: 12px 16px !important;
            padding-right: 75px !important;
            height: 48px !important;
            font-size: 16px !important;
            line-height: 1.2 !important;
            border: 1px solid #dddfe2 !important;
            border-radius: 8px !important;
            background: #ffffff !important;
            margin-bottom: 12px !important;
            margin-top: 0 !important;
            box-sizing: border-box !important;
            font-family: 'Montserrat', sans-serif !important;
          }
          .gender-dropdown {
            display: inline-block !important;
            vertical-align: middle !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .form label {
            font-size: 10.5px !important;
            margin-bottom: 2px !important;
            display: block !important;
            text-align: left !important;
            padding-left: 0 !important;
            margin-left: 0 !important;
            width: 100% !important;
          }
          .form label[for="confirmPassword"] {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          .form button[type="submit"] {
            height: 36px !important;
            font-size: 14px !important;
            padding: 8px 0 !important;
            margin-top: 10px !important;
            background: white !important;
            color: #212c59 !important;
            border: 2px solid #212c59 !important;
            border-radius: 10px !important;
            font-weight: 600 !important;
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-family: 'Montserrat', sans-serif !important;
            box-shadow: none !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            line-height: 1.15 !important;
            vertical-align: middle !important;
            position: relative !important;
            overflow: hidden !important;
            flex-shrink: 0 !important;
          }
          .form button[type="submit"]:hover {
            background: #212c59 !important;
            color: white !important;
            border-color: #1a2447 !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .form button[type="submit"]:active {
            background: #1a2447 !important;
            color: white !important;
            border-color: #1a2447 !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .form button[type="submit"]:disabled {
            opacity: 0.6 !important;
            cursor: not-allowed !important;
            transform: none !important;
            background: white !important;
            color: #212c59 !important;
            border-color: #212c59 !important;
          }
          
          /* Keep two-column layout on small mobile for consistency with desktop */
        }
      `}</style>

      <form className="form" onSubmit={handleSubmit} style={{ 
        maxWidth: 320, 
        margin: '0 auto', 
        padding: '16px 16px 0px 16px',
        width: '100%',
        boxSizing: 'border-box',
        maxHeight: 'none',
        overflowY: 'visible',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {!showOTPForm ? (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 8, fontSize: '1.3rem' }}>Sign Up</h2>
            {error && (
              <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>
            )}
        
        <div style={twoColumnStyle} className="two-column-mobile">
          <div style={halfWidthStyle} className="half-width-container">
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
          <div style={halfWidthStyle} className="half-width-container">
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

        <div style={twoColumnStyle} className="two-column-mobile">
          <div style={halfWidthStyle} className="half-width-container">
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
                direction: 'ltr',
                WebkitAppearance: 'none',
                MozAppearance: 'textfield'
              }}
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
              data-format="YYYY-MM-DD"
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div style={halfWidthStyle} className="half-width-container">
            <label htmlFor="gender" style={genderLabelStyle}>Gender</label>
            <EnhancedGenderDropdown
              value={formData.gender}
              onChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
              disabled={isLoading}
              className="gender-dropdown"
            />
          </div>
        </div>

        <div style={twoColumnStyle} className="two-column-mobile">
          <div style={halfWidthStyle} className="half-width-container">
            <label htmlFor="password" style={labelStyle}>Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                minLength={8}
                style={{ ...inputStyle('password'), width: '100%', paddingRight: '40px' }}
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
          <div style={halfWidthStyle} className="half-width-container">
            <label htmlFor="confirmPassword" style={labelStyle}>Confirm Password</label>
            <div className="password-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                minLength={8}
                style={{ ...inputStyle('confirmPassword'), width: '100%', paddingRight: '40px' }}
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
        </div>

        <button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Signing Up...' : 'Sign Up'}
        </button>

            <div className="form-footer" style={{ marginBottom: 0 }}>
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
                Verification code sent to your Email
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
                    top: '40%',
                    transform: 'translateY(-50%)',
                    background: resendCooldown > 0 ? '#6c757d' : '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '70px',
                    lineHeight: '1',
                    margin: '0',
                    boxSizing: 'border-box'
                  }}
                >
                  {isLoading ? 'Sending...' : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                </button>
              </div>
            </label>
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
