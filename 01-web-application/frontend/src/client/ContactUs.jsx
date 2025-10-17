import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FaFacebookF, FaInstagram, FaTiktok, FaTimes } from 'react-icons/fa';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import Logo from '../utils/Images/Logo.png';
import ForContactUsPageImg from '../utils/Images/Contact Us/ForContactUsPage.jpg';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import FeedbackSuccessModal from '../components/FeedbackSuccessModal';

// Styled Components
const ContactContainer = styled.div`
  font-family: 'Montserrat', sans-serif;
`;

const HeroSection = styled.div`
  position: relative;
  height: 50vh;
  overflow: hidden;
  animation: fadeIn 1s ease forwards;
`;

const HeroImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
`;

const HeroOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.55);
  color: #f5f5f5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 20px;
  z-index: 2;
  font-family: 'Montserrat', sans-serif;

  h1 {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 10px;
    text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
  }

  p {
    font-size: 1.2rem;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2.5rem;
    }
    
    p {
      font-size: 1rem;
    }
  }
`;

const ContentSection = styled.div`
  background: ${props => props.theme.bgLight};
  padding: 80px 0;
  min-height: 100vh;
`;

const ContactForm = styled.div`
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
`;

const ContactDescription = styled.div`
  padding: 20px;
  font-size: 1.1rem;
  line-height: 1.8;
  color: ${props => props.theme.text_primary};

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: ${props => props.theme.brand};
    margin-bottom: 20px;
  }

  h5 {
    font-size: 1.3rem;
    font-weight: 600;
    color: ${props => props.theme.brand};
    margin-top: 30px;
    margin-bottom: 15px;
  }

  ul {
    list-style-type: disc;
    padding-left: 20px;
    margin: 1rem 0;
  }

  li {
    margin-bottom: 12px;
    color: ${props => props.theme.text_secondary};
    line-height: 1.6;
  }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 20px;

  a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: white;
    color: #b08d57;
    border: 2px solid #b08d57;
    border-radius: 50%;
    font-size: 1.2rem;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(33, 44, 89, 0.3);

    &:hover {
      background: #b08d57;
      color: white;
      border: 2px solid #9a7a4a;
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(176, 141, 87, 0.4);
    }
  }
`;

const Footer = styled.footer`
  background: #212c59;
  color: white;
  text-align: center;
  padding: 60px 20px;
  font-family: 'Montserrat', sans-serif;

  .footer-logo {
    width: 120px;
    height: auto;
    margin-bottom: 20px;
  }

  p {
    font-size: 1.1rem;
    line-height: 1.8;
    margin-bottom: 15px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .social-icons {
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    margin-top: 30px;

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      background: white;
      color: #b08d57;
      border: 2px solid #b08d57;
      border-radius: 50%;
      font-size: 1.2rem;
      text-decoration: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(33, 44, 89, 0.3);

      &:hover {
        background: #b08d57;
        color: white;
        border: 2px solid #9a7a4a;
        transform: translateY(-3px);
        box-shadow: 0 8px 25px rgba(176, 141, 87, 0.4);
      }
    }
  }
`;

// Modal Styled Components (copied from Navbar)
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

const ContactUs = () => {
  const theme = useTheme();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isOTPFormShowing, setIsOTPFormShowing] = useState(false);
  const [isFormPreFilled, setIsFormPreFilled] = useState(false);
  const [showFeedbackSuccessModal, setShowFeedbackSuccessModal] = useState(false);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (showSignIn || showSignUp) {
      // Store scroll position
      const scrollY = window.scrollY;
      
      // Apply immediate styles
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.classList.add('modal-open');
      
      // Prevent all scroll events
      const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Add event listeners
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('scroll', preventScroll, { passive: false });
      
      // Store for cleanup
      window.contactUsScrollPrevent = preventScroll;
      
    } else {
      // Restore scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.classList.remove('modal-open');
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY.replace('-', '')));
      }
      
      // Remove event listeners
      if (window.contactUsScrollPrevent) {
        document.removeEventListener('wheel', window.contactUsScrollPrevent);
        document.removeEventListener('touchmove', window.contactUsScrollPrevent);
        document.removeEventListener('scroll', window.contactUsScrollPrevent);
        delete window.contactUsScrollPrevent;
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.classList.remove('modal-open');
      
      if (window.contactUsScrollPrevent) {
        document.removeEventListener('wheel', window.contactUsScrollPrevent);
        document.removeEventListener('touchmove', window.contactUsScrollPrevent);
        document.removeEventListener('scroll', window.contactUsScrollPrevent);
        delete window.contactUsScrollPrevent;
      }
    };
  }, [showSignIn, showSignUp]);

  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    message: '',
  });


  // Function to fetch complete user data from server
  const fetchCompleteUserData = async (token) => {
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        
        // Update storage with complete user data
        if (localStorage.getItem('token')) {
          localStorage.setItem('user', JSON.stringify(userData));
        } else if (sessionStorage.getItem('token')) {
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
        
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return null;
  };

  // Function to check auth status and update state
  const checkAuthStatus = async () => {
    // Check both localStorage and sessionStorage for token and user data
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user') || '{}';
    let user = JSON.parse(userString);
    
    if (token && user && Object.keys(user).length > 0) {
      setIsLoggedIn(true);
      setUserData(user);
      
      // Check if user data is incomplete (only has profilePicture)
      const hasOnlyProfilePicture = Object.keys(user).length === 1 && user.profilePicture;
      
      if (hasOnlyProfilePicture) {
        const completeUserData = await fetchCompleteUserData(token);
        if (completeUserData) {
          // Use the complete user data
          setUserData(completeUserData);
          user = completeUserData;
        }
      }
      
      // Pre-fill form with user data if available
      // Try different possible field names for name and email
      const userName = user.fullName || user.name || user.username || '';
      const userEmail = user.email || '';
      
      if (userName && userEmail) {
        setFormValues(prev => ({
          ...prev,
          name: userName,
          email: userEmail
        }));
        setIsFormPreFilled(true);
      } else {
        setIsFormPreFilled(false);
      }
    } else {
      setIsLoggedIn(false);
      setUserData(null);
      // Clear form when user is not logged in
      setFormValues({
        name: '',
        email: '',
        message: ''
      });
      setIsFormPreFilled(false);
    }
  };

  // Check authentication status on mount and when auth changes
  useEffect(() => {
    checkAuthStatus();

    // Listen for auth changes (sign in/out)
    const handleAuthChange = () => checkAuthStatus();
    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  // Debug form values changes

  const validateEmail = (email) => {
    const validDomains = ['@gmail.com', '@yahoo.com'];
    return validDomains.some(domain => email.toLowerCase().endsWith(domain));
  };

  const handleSignInSuccess = () => {
    setShowSignIn(false);
    setShowSignUp(false);
    // Trigger auth change event before checking status
    window.dispatchEvent(new Event('authChange'));
    // Wait a brief moment before checking auth status to ensure event has propagated
    setTimeout(() => {
      checkAuthStatus();
      alert('Successfully signed in! Your information has been pre-filled in the form.');
    }, 100);
  };

  const handleSignUpSuccess = () => {
    setShowSignIn(false);
    setShowSignUp(false);
    // Trigger auth change event before checking status
    window.dispatchEvent(new Event('authChange'));
    // Wait a brief moment before checking auth status to ensure event has propagated
    setTimeout(() => {
      checkAuthStatus();
      alert('Successfully signed up! Your information has been pre-filled in the form.');
    }, 100);
  };

  const handleSwitchToSignUp = () => {
    setShowSignIn(false);
    setShowSignUp(true);
  };

  const handleSwitchToSignIn = () => {
    setShowSignUp(false);
    setShowSignIn(true);
  };

  const handleFormChange = (e) => {
    // Prevent changes to name and email when logged in
    if (isLoggedIn && (e.target.name === 'name' || e.target.name === 'email')) {
      return;
    }
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleTextboxClick = (e, fieldName) => {
    // Show sign-in modal if user is not logged in
    if (!isLoggedIn) {
      e.preventDefault();
      e.target.blur(); // Remove focus from the textbox
      setShowSignIn(true);
    }
  };

  const handleTextboxFocus = (e, fieldName) => {
    // Show sign-in modal if user is not logged in
    if (!isLoggedIn) {
      e.preventDefault();
      e.target.blur(); // Remove focus from the textbox
      setShowSignIn(true);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Check if user is logged in
    if (!isLoggedIn) {
      setShowSignIn(true);
      return;
    }

    // Check if form fields are empty
    if (!formValues.name.trim() || !formValues.email.trim() || !formValues.message.trim()) {
      alert('Please fill in all the required fields before sending your message.');
      return;
    }

    // Validate email format
    if (!validateEmail(formValues.email)) {
      alert('Please use a valid email address');
      return;
    }

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formValues),
      });

      if (response.ok) {
        const data = await response.json();
        setShowFeedbackSuccessModal(true);
        // Clear only the message field after successful submission, keep name and email if user is logged in
        setFormValues(prev => ({
          ...prev,
          message: ''
        }));
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {

      alert('An error occurred while sending the message. Please try again.');
    }
  };



  return (
    <ContactContainer>
      {/* Hero Section */}
      <HeroSection>
        <HeroImage src={ForContactUsPageImg} alt="Nomu Cafe Contact Hero" />
        <HeroOverlay>
          <h1>CONTACT US</h1>
          <p>Whether it's feedback or flavor, we'd love to hear from you.</p>
        </HeroOverlay>
      </HeroSection>

      {/* Contact Form & Description */}
      <ContentSection>
        <Container>
          <Row className="mb-5 gy-4">
            <Col md={6} className="order-1 order-md-1">
              <ContactDescription>
                <h1>Get in touch</h1>
                <p>We're all ears and ready to chat! Whether you've got questions, feedback, or just want to say hello, we're here to listen.</p>
                
                <ul>
                  <li>Got thoughts? We're listening.</li>
                  <li>Curious about our menu? Ask away!</li>
                  <li>Suggestions to make us better? Bring 'em on.</li>
                  <li>Just want to say hello? We love that too!</li>
                </ul>

                {!isLoggedIn && (
                  <div className="alert alert-info" role="alert" style={{ marginTop: '0', marginBottom: '0' }}>
                    <h5>Why Sign In?</h5>
                    <p className="mb-2">Signing in helps us:</p>
                    <ul className="mb-0" style={{ fontSize: '0.9em' }}>
                      <li>Provide personalized responses to your inquiries</li>
                      <li>Keep track of your previous interactions with us</li>
                      <li>Ensure the authenticity of feedback</li>
                      <li>Protect against spam and automated messages</li>
                    </ul>
                  </div>
                )}

                <h5>Follow Us</h5>
                <SocialIcons>
                  <a href="https://www.facebook.com/nomuPH" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <FaFacebookF />
                  </a>
                  <a href="https://www.instagram.com/nomu.ph/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <FaInstagram />
                  </a>
                  <a href="https://www.tiktok.com/@nomu.ph" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                    <FaTiktok />
                  </a>
                </SocialIcons>
              </ContactDescription>
            </Col>

            <Col md={6} className="order-2 order-md-2">
              <ContactForm>
                <Form onSubmit={handleFormSubmit}>
                  <Form.Group controlId="formName" className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Your Name"
                      name="name"
                      value={formValues.name}
                      onChange={handleFormChange}
                      onClick={(e) => handleTextboxClick(e, 'name')}
                      onFocus={(e) => handleTextboxFocus(e, 'name')}
                      readOnly={isLoggedIn}
                      style={isLoggedIn ? { 
                        backgroundColor: '#e9ecef', 
                        cursor: 'not-allowed',
                        borderColor: '#ced4da'
                      } : {}}
                    />
                  </Form.Group>

                  <Form.Group controlId="formEmail" className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Your Email"
                      name="email"
                      value={formValues.email}
                      onChange={handleFormChange}
                      onClick={(e) => handleTextboxClick(e, 'email')}
                      onFocus={(e) => handleTextboxFocus(e, 'email')}
                      readOnly={isLoggedIn}
                      style={isLoggedIn ? { 
                        backgroundColor: '#e9ecef', 
                        cursor: 'not-allowed',
                        borderColor: '#ced4da'
                      } : {}}
                    />
                  </Form.Group>

                  <Form.Group controlId="formMessage" className="mb-3">
                    <Form.Label>Message</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      placeholder="Your Message"
                      name="message"
                      value={formValues.message}
                      onChange={handleFormChange}
                      onClick={(e) => handleTextboxClick(e, 'message')}
                      onFocus={(e) => handleTextboxFocus(e, 'message')}
                    />
                  </Form.Group>

                  <Button 
                    className="contact-button-blue" 
                    type="submit"
                  >
                    {isLoggedIn ? 'Send Feedback' : 'Send Feedback'}
                  </Button>
                </Form>
              </ContactForm>
            </Col>
          </Row>
        </Container>
      </ContentSection>

      {/* Footer */}
      <Footer>
        <img src={Logo} alt="Nomu Cafe Logo" className="footer-logo" />
        <p>Not just a café. A feeling you'll come back for.</p>
        <p>A place where every sip tells a story, and every visit feels like coming home.</p>
        <p>Crafted with care, rooted in Japanese flavors, and always served with warmth.</p>
        <nav aria-label="Social media links">
          <div className="social-icons">
            <a href="https://www.facebook.com/nomuPH" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebookF />
            </a>
            <a href="https://www.instagram.com/nomu.ph/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
            <a href="https://www.tiktok.com/@nomu.ph" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <FaTiktok />
            </a>
          </div>
        </nav>
      </Footer>

      {/* Sign In/Sign Up Modal */}
      {(showSignIn || showSignUp) && (
        <ModalBackdrop>
          <ModalContent onClick={e => e.stopPropagation()}>
            {showSignIn ? (
              <SignInForm
                onSubmit={handleSignInSuccess}
                onSwitch={handleSwitchToSignUp}
                onOTPStateChange={setIsOTPFormShowing}
              />
            ) : (
              <SignUpForm
                onSubmit={handleSignUpSuccess}
                onSwitch={handleSwitchToSignIn}
                onOTPStateChange={setIsOTPFormShowing}
              />
            )}
            {!isOTPFormShowing && (
              <CloseModalButton onClick={() => {
                setShowSignIn(false);
                setShowSignUp(false);
              }}>
                <FaTimes />
              </CloseModalButton>
            )}
          </ModalContent>
        </ModalBackdrop>
      )}

      {/* Feedback Success Modal */}
      <FeedbackSuccessModal 
        isOpen={showFeedbackSuccessModal} 
        onClose={() => setShowFeedbackSuccessModal(false)} 
      />

    </ContactContainer>
  );
};

export default ContactUs;
