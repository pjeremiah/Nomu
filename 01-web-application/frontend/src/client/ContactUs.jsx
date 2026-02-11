import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import Logo from '../utils/Images/Logo.png';
import ForContactUsPageImg from '../utils/Images/Contact Us/ForContactUsPage.jpg';
import FeedbackSuccessModal from '../components/FeedbackSuccessModal';

const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY || '';

// Styled Components
const ContactContainer = styled.div`
  font-family: 'Montserrat', sans-serif;
  
  /* Override Bootstrap container padding on mobile */
  .container {
    @media (max-width: 768px) {
      padding-left: 15px !important;
      padding-right: 15px !important;
    }
    
    @media (max-width: 480px) {
      padding-left: 10px !important;
      padding-right: 10px !important;
    }
  }
  
  /* Ensure rows have no gutters on mobile */
  .row {
    @media (max-width: 768px) {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
  
  /* Ensure columns have no padding on mobile */
  .col, .col-md-6 {
    @media (max-width: 768px) {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
  }
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
  
  @media (max-width: 768px) {
    padding: 25px 20px;
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }
  
  @media (max-width: 480px) {
    padding: 20px 15px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.06);
  }
  
  /* Ensure form elements take full width and have proper spacing */
  .form-control {
    @media (max-width: 768px) {
      width: 100% !important;
      box-sizing: border-box;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
  
  .form-group {
    @media (max-width: 768px) {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
  
  .btn {
    @media (max-width: 768px) {
      width: 100% !important;
      padding: 12px 20px;
      font-size: 0.9rem;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
    
    @media (max-width: 480px) {
      padding: 10px 16px;
      font-size: 0.85rem;
    }
  }
  
  /* Ensure form labels are properly aligned */
  .form-label {
    @media (max-width: 768px) {
      margin-left: 0 !important;
      margin-right: 0 !important;
    }
  }
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

const ContactUs = () => {
  const theme = useTheme();
  const [showFeedbackSuccessModal, setShowFeedbackSuccessModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const recaptchaRef = useRef(null);
  const recaptchaWrapperRef = useRef(null);
  const recaptchaWidgetIdRef = useRef(null);

  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    name: false,
    email: false,
    message: false,
  });

  const [recaptchaError, setRecaptchaError] = useState(false);

  // Load reCAPTCHA script and render widget
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    if (window.grecaptcha && window.grecaptcha.render) {
      setRecaptchaReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    window.onRecaptchaLoad = () => setRecaptchaReady(true);
    document.head.appendChild(script);
    return () => {
      window.onRecaptchaLoad = null;
    };
  }, []);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || !recaptchaReady || !recaptchaRef.current || !window.grecaptcha) return;
    if (recaptchaWidgetIdRef.current !== null) return; // already rendered
    try {
      const widgetId = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        theme: 'light',
        size: 'normal',
        callback: () => setRecaptchaError(false) // clear error when user completes it
      });
      recaptchaWidgetIdRef.current = widgetId;
    } catch (err) {
      console.error('reCAPTCHA render error:', err);
    }
  }, [recaptchaReady]);


  const validateEmail = (email) => {
    const validDomains = ['@gmail.com', '@yahoo.com'];
    return validDomains.some(domain => email.toLowerCase().endsWith(domain));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: false }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Check if form fields are empty – show red borders on empty required fields
    const nameEmpty = !formValues.name.trim();
    const emailEmpty = !formValues.email.trim();
    const messageEmpty = !formValues.message.trim();
    if (nameEmpty || emailEmpty || messageEmpty) {
      setFieldErrors({
        name: nameEmpty,
        email: emailEmpty,
        message: messageEmpty,
      });
      return;
    }

    // Validate email format
    if (!validateEmail(formValues.email)) {
      setFieldErrors(prev => ({ ...prev, email: true }));
      return;
    }

    // reCAPTCHA: require verification when site key is configured
    let recaptchaToken = '';
    if (RECAPTCHA_SITE_KEY && window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
      recaptchaToken = window.grecaptcha.getResponse(recaptchaWidgetIdRef.current);
      if (!recaptchaToken) {
        setRecaptchaError(true);
        recaptchaWrapperRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
    setRecaptchaError(false);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formValues,
          recaptchaToken: recaptchaToken || undefined
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (RECAPTCHA_SITE_KEY && window.grecaptcha && recaptchaWidgetIdRef.current !== null) {
          window.grecaptcha.reset(recaptchaWidgetIdRef.current);
        }
        setShowFeedbackSuccessModal(true);
        setFormValues(prev => ({ ...prev, message: '' }));
        setFieldErrors({ name: false, email: false, message: false });
        setRecaptchaError(false);
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
                      style={{
                        borderColor: fieldErrors.name ? '#dc3545' : undefined,
                        borderWidth: fieldErrors.name ? 2 : undefined,
                        boxShadow: fieldErrors.name ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : undefined,
                      }}
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
                      style={{
                        borderColor: fieldErrors.email ? '#dc3545' : undefined,
                        borderWidth: fieldErrors.email ? 2 : undefined,
                        boxShadow: fieldErrors.email ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : undefined,
                      }}
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
                      style={{
                        borderColor: fieldErrors.message ? '#dc3545' : undefined,
                        borderWidth: fieldErrors.message ? 2 : undefined,
                        boxShadow: fieldErrors.message ? '0 0 0 0.2rem rgba(220, 53, 69, 0.25)' : undefined,
                      }}
                    />
                  </Form.Group>

                  {RECAPTCHA_SITE_KEY && (
                    <Form.Group className="mb-3">
                      <div
                        ref={recaptchaWrapperRef}
                        style={{
                          padding: recaptchaError ? '12px' : 0,
                          border: recaptchaError ? '2px solid #dc3545' : '2px solid transparent',
                          borderRadius: 8,
                          backgroundColor: recaptchaError ? 'rgba(220, 53, 69, 0.05)' : 'transparent',
                          transition: 'border-color 0.2s ease, background-color 0.2s ease',
                        }}
                        data-testid="recaptcha-wrapper"
                      >
                        <div ref={recaptchaRef} data-testid="recaptcha-container" />
                      </div>
                      {recaptchaError && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: '14px',
                            color: '#dc3545',
                            fontWeight: 500,
                          }}
                          role="alert"
                        >
                          Please complete the "I'm not a robot" verification above before sending.
                        </div>
                      )}
                    </Form.Group>
                  )}

                  <Button 
                    className="contact-button-blue" 
                    type="submit"
                  >
                    Send Feedback
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

      {/* Feedback Success Modal */}
      <FeedbackSuccessModal 
        isOpen={showFeedbackSuccessModal} 
        onClose={() => setShowFeedbackSuccessModal(false)} 
      />

    </ContactContainer>
  );
};

export default ContactUs;
