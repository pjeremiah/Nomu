import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { FaMobileAlt, FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import Logo from '../utils/Images/Logo.png';
import ForNomuAppPageImage from '../utils/Images/NomuAppPage/ForNomuAppPage.jpg';
import VirtualLoyaltyCardImg from '../utils/Images/NomuAppPage/VirtualLoyaltyCard.png';
import LoginImg from '../utils/Images/NomuAppPage/Login.png';
import SplashArtImg from '../utils/Images/NomuAppPage/SplashArt.png';

const DOWNLOAD_APP_URL = 'https://drive.google.com/drive/folders/1XJyZEK_KEOs-Ew8n_mjpR_T-fW_ro2T1?usp=sharing';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const PageContainer = styled.div`
  font-family: 'Montserrat', sans-serif;
  min-height: 100vh;
`;

const HeroSection = styled.div`
  position: relative;
  height: 50vh;
  min-height: 280px;
  overflow: hidden;
  animation: ${fadeIn} 1s ease forwards;
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
    text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.8);
  }

  p {
    font-size: 1.2rem;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.6);
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
  padding: 0;
  max-width: 100%;
  margin: 0 auto;
`;

/* Full-width strip for alternating background and scroll animation */
const ShowcaseStrip = styled.section`
  background: ${props => props.$alt ? 'linear-gradient(180deg, #f0f4f8 0%, #f8f9fa 100%)' : '#ffffff'};
  padding: 56px 24px;
  margin: 0 auto;
  transition: background 0.4s ease;

  @media (max-width: 968px) {
    padding: 44px 20px;
  }
`;

const ShowcaseInner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  min-height: 340px;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: translateY(${props => props.$visible ? 0 : 32}px);
  transition: opacity 0.7s ease-out, transform 0.7s ease-out;

  @media (max-width: 968px) {
    flex-direction: ${props => props.$reversed ? 'column-reverse' : 'column'};
    gap: 32px;
    padding: 0;
    min-height: 0;
  }
`;

/* ZUS-style feature showcase: alternating section with headline + description + phone mockup */
const ShowcaseSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  width: 100%;

  @media (max-width: 968px) {
    flex-direction: column;
    gap: 32px;
  }
`;

const ShowcaseSectionReversed = styled(ShowcaseSection)`
  flex-direction: row-reverse;

  /* Mobile: same as other sections – title/body on top, phone below (uniform) */
  @media (max-width: 968px) {
    flex-direction: column;
  }
`;

const ShowcaseContent = styled.div`
  flex: 1;
  max-width: 520px;
  transition: opacity 0.6s ease-out 0.1s, transform 0.6s ease-out 0.1s;

  @media (max-width: 968px) {
    max-width: 100%;
    text-align: center;
  }
`;

const ShowcaseHeadline = styled.h2`
  color: #212c59;
  font-size: 2.35rem;
  font-weight: 700;
  margin: 0 0 20px 0;
  font-family: 'Montserrat', sans-serif;
  line-height: 1.25;

  @media (max-width: 768px) {
    font-size: 1.85rem;
    margin-bottom: 16px;
  }
`;

const ShowcaseDescription = styled.p`
  color: #5a6c7d;
  font-size: 1.2rem;
  line-height: 1.75;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }

  @media (max-width: 968px) {
    text-align: center;
  }
`;

const PhoneMockup = styled.div`
  flex-shrink: 0;
  width: 260px;
  max-width: 100%;
  background: transparent;
  border-radius: 32px;
  padding: 12px;
  transition: transform 0.4s ease;

  &:hover {
    transform: scale(1.03);
  }

  @media (max-width: 968px) {
    width: 220px;
    border-radius: 28px;
    padding: 10px;

    &:hover {
      transform: scale(1.02);
    }
  }
`;

const PhoneScreen = styled.img`
  display: block;
  width: 100%;
  height: auto;
  border-radius: 24px;
  object-fit: cover;

  @media (max-width: 968px) {
    border-radius: 20px;
  }
`;

const CtaStrip = styled.div`
  background: linear-gradient(180deg, #faf8f5 0%, #f0ebe3 100%);
  padding: 48px 24px 56px;
  text-align: center;
  position: relative;
  border-top: 1px solid rgba(33, 44, 89, 0.06);
`;

const CtaBlock = styled.div`
  position: relative;
  z-index: 1;
  max-width: 480px;
  margin: 0 auto;
  opacity: ${props => props.$visible ? 1 : 0};
  transform: translateY(${props => props.$visible ? 0 : 24}px);
  transition: opacity 0.7s ease-out, transform 0.7s ease-out;
`;

const CtaIcon = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: rgba(176, 141, 87, 0.12);
  border: 2px solid #b08d57;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b08d57;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const CtaTitle = styled.h3`
  color: #212c59;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 10px 0;
  font-family: 'Montserrat', sans-serif;
  letter-spacing: 0.02em;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const CtaText = styled.p`
  color: #5a6c7d;
  font-size: 1.1rem;
  margin: 0 0 24px 0;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 1.05rem;
    margin-bottom: 20px;
  }
`;

const DownloadButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  border-radius: 12px;
  padding: 16px 36px;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Montserrat', sans-serif;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(176, 141, 87, 0.2);

  &:hover {
    background: #b08d57;
    color: white;
    border-color: #9a7a4a;
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(176, 141, 87, 0.35);
    text-decoration: none;
  }

  &:active {
    transform: translateY(0);
  }
`;

const Footer = styled.footer`
  background: #1a2244;
  color: white;
  text-align: center;
  padding: 48px 20px 56px;
  font-family: 'Montserrat', sans-serif;
  border-top: 1px solid rgba(255, 255, 255, 0.06);

  .footer-logo {
    width: 100px;
    height: auto;
    margin-bottom: 16px;
  }

  p {
    font-size: 1rem;
    line-height: 1.7;
    margin-bottom: 12px;
    max-width: 720px;
    margin-left: auto;
    margin-right: auto;
  }

  .social-icons {
    display: flex;
    justify-content: center;
    gap: 1.25rem;
    margin-top: 24px;

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

const NomuApp = () => {
  const [visible, setVisible] = useState({ section0: false, section1: false, section2: false, cta: false });
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const refCta = useRef(null);

  useEffect(() => {
    const observers = [];
    const opts = { root: null, rootMargin: '0px 0px -80px 0px', threshold: 0.15 };

    const observe = (ref, key) => {
      if (!ref?.current) return;
      const ob = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setVisible((v) => ({ ...v, [key]: true }));
      }, opts);
      ob.observe(ref.current);
      observers.push(ob);
    };

    observe(ref0, 'section0');
    observe(ref1, 'section1');
    observe(ref2, 'section2');
    observe(refCta, 'cta');

    return () => observers.forEach((ob) => ob.disconnect());
  }, []);

  return (
    <PageContainer>
      <HeroSection>
        <HeroImage src={ForNomuAppPageImage} alt="Nomu App Hero" />
        <HeroOverlay>
          <h1>NOMU APP</h1>
          <p>Your virtual loyalty card. Every visit earns you points. Get rewarded, stay connected, Nomu in your pocket.</p>
        </HeroOverlay>
      </HeroSection>

      <ContentSection>
        {/* 1. Redeem rewards – My Loyalty Card (text left, phone right) */}
        <ShowcaseStrip $alt={false}>
          <div ref={ref0}>
            <ShowcaseInner $visible={visible.section0} $reversed={false}>
            <ShowcaseSection>
              <ShowcaseContent>
                <ShowcaseHeadline>Turn every coffee run into a reward.</ShowcaseHeadline>
                <ShowcaseDescription>
                  Collect stamps with every purchase and unlock exclusive Nomu treats right inside the app.
                </ShowcaseDescription>
              </ShowcaseContent>
              <PhoneMockup>
                <PhoneScreen src={VirtualLoyaltyCardImg} alt="Nomu App – My Loyalty Card" />
              </PhoneMockup>
            </ShowcaseSection>
          </ShowcaseInner>
          </div>
        </ShowcaseStrip>

        {/* 2. Get started in seconds – Login (text right, phone left) */}
        <ShowcaseStrip $alt>
          <div ref={ref1}>
            <ShowcaseInner $visible={visible.section1} $reversed>
            <ShowcaseSectionReversed>
              <ShowcaseContent>
                <ShowcaseHeadline>Get started in seconds</ShowcaseHeadline>
                <ShowcaseDescription>
                  Start earning rewards with a simple sign in. One account lets you collect stamps, unlock exclusive Nomu treats, and stay updated on today's latest promos. New here? Signing up takes just a tap.
                </ShowcaseDescription>
              </ShowcaseContent>
              <PhoneMockup>
                <PhoneScreen src={LoginImg} alt="Nomu App – Login" />
              </PhoneMockup>
            </ShowcaseSectionReversed>
          </ShowcaseInner>
          </div>
        </ShowcaseStrip>

        {/* 3. Nomu in your pocket – Splash / Brand (text left, phone right) */}
        <ShowcaseStrip $alt={false}>
          <div ref={ref2}>
            <ShowcaseInner $visible={visible.section2} $reversed={false}>
            <ShowcaseSection>
              <ShowcaseContent>
                <ShowcaseHeadline>Nomu in your pocket</ShowcaseHeadline>
                <ShowcaseDescription>
                  Your virtual loyalty card and the latest Nomu promos all in one app. Collect stamps with every purchase and unlock exclusive Nomu treats along the way.
                </ShowcaseDescription>
              </ShowcaseContent>
              <PhoneMockup>
                <PhoneScreen src={SplashArtImg} alt="Nomu App – Splash" />
              </PhoneMockup>
            </ShowcaseSection>
          </ShowcaseInner>
          </div>
        </ShowcaseStrip>

        <CtaStrip>
          <div ref={refCta}>
          <CtaBlock $visible={visible.cta}>
            <CtaIcon>
              <FaMobileAlt />
            </CtaIcon>
            <CtaTitle>Get the app</CtaTitle>
            <CtaText>Earn stamps, unlock treats, and never miss a promo. Download free on Android. Nomu goes where you go.</CtaText>
            <DownloadButton
              href={DOWNLOAD_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Download Nomu Application"
            >
              <FaMobileAlt />
              Download Nomu Application
            </DownloadButton>
          </CtaBlock>
          </div>
        </CtaStrip>
      </ContentSection>

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
    </PageContainer>
  );
};

export default NomuApp;
