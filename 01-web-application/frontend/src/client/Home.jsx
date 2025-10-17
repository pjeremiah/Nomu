import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import HomeVideo from '../utils/Videos/VideoForHome.mp4';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import Logo from '../utils/Images/Logo.png';
import ForHomePageMenuImage from '../utils/Images/Home/ForHomePageMenu.jpg';
import ForHomePageAboutImage from '../utils/Images/Home/ForHomePageAbout.jpg';
import ForHomePageLocationImage from '../utils/Images/Home/ForHomePageLocation.jpg';
import PromoCarousel from '../components/PromoCarousel';

// Styled Components
const HomeContainer = styled.div`
  background-color: ${props => props.theme.bg};
  color: ${props => props.theme.text_primary};
  transition: background-color 0.3s ease, color 0.3s ease;
`;

const HeroContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  animation: fadeIn 1s ease forwards;
`;

const HeroVideo = styled.video`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1;
`;

const HeroOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  color: #f5f5f5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 0 20px;
  z-index: 1;

  h1 {
    font-size: 4rem;
    font-weight: 800;
    margin-bottom: 20px;
    color: #ffffff;
    text-shadow: 2px 2px 8px rgba(0,0,0,0.8);
  }

  p {
    font-size: 1.4rem;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
    font-weight: 300;
    letter-spacing: 1px;
    animation: fadeInUp 1.5s ease-out 0.5s both;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const GridSection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  width: 100%;
  min-height: 80vh;

  @media screen and (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, auto);
  }
`;

const GridItem = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding: 3rem 2rem;
  font-family: 'Montserrat', sans-serif;
  overflow: hidden;
  background: ${props => props.theme.isDarkMode 
    ? 'linear-gradient(135deg, #2a3a6b 0%, #212c59 100%)' 
    : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
  };
  color: ${props => props.theme.text_primary};
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: ${props => props.theme.isDarkMode 
    ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
    : '0 8px 32px rgba(0, 0, 0, 0.1)'
  };

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      ${props => props.theme.accent}20 0%, 
      transparent 50%, 
      ${props => props.theme.brand}20 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
    z-index: 0;
  }

  &:hover {
    border-color: ${props => props.theme.accent};
    box-shadow: ${props => props.theme.isDarkMode 
      ? '0 20px 60px rgba(176, 141, 87, 0.3)' 
      : '0 20px 60px rgba(176, 141, 87, 0.2)'
    };

    &::before {
      opacity: 1;
    }
  }

  &.image {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    overflow: hidden;
    width: 100%;
    position: relative;
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 8px;
    aspect-ratio: 1920/1080;
    height: auto;
  }

  > * {
    position: relative;
    z-index: 1;
  }

  h2 {
    color: ${props => props.theme.text_primary};
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    text-shadow: ${props => props.theme.isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'};
  }

  p {
    color: ${props => props.theme.text_secondary};
    text-align: justify;
    font-size: 1.1rem;
    line-height: 1.7;
    max-width: 400px;
    text-shadow: ${props => props.theme.isDarkMode ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'};
  }

`;

const GridImage = styled.img`
  width: 70px;
  height: 70px;
  object-fit: contain;
  margin-bottom: 1rem;

  &.full {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center center;
    display: block;
    margin: 0;
    padding: 0;     
    border: none;       
    line-height: 0;
    border-radius: 8px;
    transition: transform 0.3s ease;
    aspect-ratio: 1920/1080;
    
    &:hover {
      transform: scale(1.02);
    }
  }
`;

const GridButton = styled.button`
  margin-top: 2rem;
  padding: 1rem 2.5rem;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #212c59 0%, #2a3a6b 100%);
  color: white;
  border: 2px solid #b08d57;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  box-shadow: 0 4px 15px rgba(33, 44, 89, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover {
    background: linear-gradient(135deg, #b08d57 0%, #c49d67 100%);
    border-color: #212c59;
    color: #212c59;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(176, 141, 87, 0.4);
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(33, 44, 89, 0.3);
  }
`;

const Footer = styled.div`
  width: 100%;
  background: ${props => props.theme.brand};
  color: ${props => props.theme.menu_primary_text};
  text-align: center;
  padding: 4rem 2rem;
  animation: fadeIn 1s ease forwards;

  p {
    margin: 12px 0;
    font-weight: 300;
    font-size: 1.1rem;
    line-height: 1.6;
    opacity: 0.9;
  }
`;

const FooterLogo = styled.img`
  width: 120px;
  margin: 0 auto 1rem auto;
  filter: brightness(0) invert(1);
  display: block;
`;

const SocialIcons = styled.div`
  margin: 3rem 0 1rem 0;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  font-size: 1.2rem;

  a {
    color: #b08d57;
    transition: all 0.3s ease;
    padding: 12px;
    border-radius: 50%;
    background: white;
    border: 2px solid #b08d57;
    position: relative;
    overflow: hidden;
    animation: fadeInUp 1s ease-out 1s both;

    &:hover,
    &:focus {
      background: #b08d57;
      color: white;
      border: 2px solid #9a7a4a;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(176, 141, 87, 0.3);
    }

    &:active {
      transform: translateY(0);
    }

    &:nth-child(1) { animation-delay: 1.1s; }
    &:nth-child(2) { animation-delay: 1.2s; }
    &:nth-child(3) { animation-delay: 1.3s; }
  }
`;

// Location Section - Manila Cafe Style
const LocationSection = styled.section`
  position: relative;
  width: 100%;
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: url(${ForHomePageLocationImage});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  color: white;
  overflow: hidden;
`;

const LocationImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AboutOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
`;

const AboutContent = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 800px;
  padding: 0 2rem;
`;

const AboutTitle = styled.h2`
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
  line-height: 1.1;
  letter-spacing: 1px;
  
  @media (max-width: 768px) {
    font-size: 2rem;
    letter-spacing: 0.5px;
  }
`;

const AboutSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem 0;
  gap: 1rem;
  
  &::before,
  &::after {
    content: '';
    width: 80px;
    height: 2px;
    background: #b08d57;
  }
  
  .coffee-bean {
    width: 24px;
    height: 24px;
    background: #b08d57;
    border-radius: 50%;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 14px;
      height: 14px;
      background: #8b6f47;
      border-radius: 50%;
    }
  }
`;

const AboutDescription = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  font-weight: 300;
  letter-spacing: 0.5px;
`;

const AboutButton = styled.button`
  background: transparent;
  color: white;
  border: 2px solid white;
  padding: 15px 35px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: white;
    color: #212c59;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// Location Section Components
const LocationContent = styled.div`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 800px;
  padding: 0 2rem;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  @media (max-width: 768px) {
    padding: 0 1rem;
    max-width: 100%;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    padding: 0 0.5rem;
    max-width: 100%;
    width: 100%;
  }
`;

const LocationTitle = styled.h2`
  font-size: 3rem;
  font-weight: 800;
  margin: 0 auto 1.5rem auto;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
  line-height: 1.1;
  letter-spacing: 1px;
  white-space: nowrap;
  text-align: center;
  width: 100%;
  transform: translateX(-15px);
  
  @media (max-width: 1024px) {
    font-size: 2.5rem;
    transform: translateX(-12px);
  }
  
  @media (max-width: 768px) {
    font-size: 2rem;
    letter-spacing: 0.5px;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    margin: 0 auto 1.5rem auto;
    text-align: center;
    transform: none;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
    letter-spacing: 0.3px;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    margin: 0 auto 1.5rem auto;
    text-align: center;
    transform: none;
  }
`;

const LocationSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem 0;
  gap: 1rem;
  
  &::before,
  &::after {
    content: '';
    width: 80px;
    height: 2px;
    background: #b08d57;
  }
  
  .coffee-bean {
    width: 24px;
    height: 24px;
    background: #b08d57;
    border-radius: 50%;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 14px;
      height: 14px;
      background: #8b6f47;
      border-radius: 50%;
    }
  }
`;

const LocationDescription = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  margin: 0 auto 2rem auto;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
  font-weight: 300;
  letter-spacing: 0.5px;
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  text-align: center;
  width: 100%;
  
  @media (max-width: 768px) {
    font-size: 1rem;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    margin: 0 auto 2rem auto;
    text-align: center;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    margin: 0 auto 2rem auto;
    text-align: center;
  }
`;

const LocationButton = styled.button`
  background: transparent;
  color: white;
  border: 2px solid white;
  padding: 15px 35px;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: white;
    color: #212c59;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// Menu and About Sections - Manila Cafe Style
const MenuAboutSection = styled.section`
  display: flex;
  min-height: 80vh;
  background: white;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const MenuSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  text-align: center;
`;

const AboutSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  background: #f8f9fa;
  text-align: center;
`;

const MenuImage = styled.div`
  width: 100%;
  max-width: 600px;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    height: 300px;
    max-width: 500px;
  }
`;

const AboutImage = styled.div`
  width: 100%;
  max-width: 600px;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.05);
  }
  
  @media (max-width: 768px) {
    height: 300px;
    max-width: 500px;
  }
`;

const MenuContent = styled.div`
  width: 100%;
  max-width: 400px;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const AboutUsContent = styled.div`
  width: 100%;
  max-width: 400px;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const MenuTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const AboutUsTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  color: #2c3e50;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const MenuSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 1.5rem 0;
  gap: 1rem;
  
  &::before,
  &::after {
    content: '';
    width: 60px;
    height: 2px;
    background: #b08d57;
  }
  
  .coffee-bean {
    width: 20px;
    height: 20px;
    background: #b08d57;
    border-radius: 50%;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #8b6f47;
      border-radius: 50%;
    }
  }
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const AboutUsSeparator = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 1.5rem 0;
  gap: 1rem;
  
  &::before,
  &::after {
    content: '';
    width: 60px;
    height: 2px;
    background: #b08d57;
  }
  
  .coffee-bean {
    width: 20px;
    height: 20px;
    background: #b08d57;
    border-radius: 50%;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #8b6f47;
      border-radius: 50%;
    }
  }
  
  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const MenuDescription = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  color: #5a6c7d;
  font-weight: 400;
  letter-spacing: 0.5px;
`;

const AboutUsDescription = styled.p`
  font-size: 1.2rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  color: #5a6c7d;
  font-weight: 400;
  letter-spacing: 0.5px;
`;

const MenuButton = styled.button`
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  padding: 15px 30px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #b08d57;
    color: white;
    border: 2px solid #9a7a4a;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(176, 141, 87, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const AboutUsButton = styled.button`
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  padding: 15px 30px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: #b08d57;
    color: white;
    border: 2px solid #9a7a4a;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(176, 141, 87, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const Home = () => {

  const navigate = useNavigate();

  return (
    <HomeContainer>
      {/* Hero Section */}
      <HeroContainer>
        <HeroVideo
          src={HomeVideo}
          autoPlay
          muted
          loop
          playsInline
        />
        <HeroOverlay>
          <h1>Welcome to Nomu Café</h1>
          <p>Authentic Japanese coffee experience</p>
        </HeroOverlay>
      </HeroContainer>
      {/* Menu and About Sections - Manila Cafe Style */}
      <MenuAboutSection>
        {/* Menu Section */}
        <MenuSection>
          <MenuImage>
            <img src={ForHomePageMenuImage} alt="Menu Items" />
          </MenuImage>
          <MenuContent>
            <MenuTitle>Bold or Blissful?</MenuTitle>
            <MenuSeparator>
              <div className="coffee-bean"></div>
            </MenuSeparator>
            <MenuDescription>Whether you're craving rich espresso or calming tea, your perfect sip awaits.</MenuDescription>
            <MenuButton onClick={() => navigate("/menu")}>Explore our Menu</MenuButton>
          </MenuContent>
        </MenuSection>

        {/* About Us Section */}
        <AboutSection>
          <AboutImage>
            <img src={ForHomePageAboutImage} alt="About Us" />
          </AboutImage>
          <AboutUsContent>
            <AboutUsTitle>More Than a Café.</AboutUsTitle>
            <AboutUsSeparator>
              <div className="coffee-bean"></div>
            </AboutUsSeparator>
            <AboutUsDescription>Dive into our story a blend of Japanese passion and local heart.</AboutUsDescription>
            <AboutUsButton onClick={() => navigate("/aboutus")}>About Us</AboutUsButton>
          </AboutUsContent>
        </AboutSection>
      </MenuAboutSection>

      {/* Location Section */}
      <LocationSection>
        <LocationImage>
          <img src={ForHomePageLocationImage} alt="Location" />
        </LocationImage>
        <LocationContent>
          <LocationTitle>WHERE TASTE MEETS TRADITION</LocationTitle>
          <LocationSeparator>
            <div className="coffee-bean"></div>
          </LocationSeparator>
          <LocationDescription>
            WHERE EVERY SIP TELLS A STORY - VISIT US!
          </LocationDescription>
          <LocationButton onClick={() => navigate("/location")}>
            OUR LOCATIONS
          </LocationButton>
        </LocationContent>
      </LocationSection>

      {/* Promo Carousel */}
      <PromoCarousel />

      {/* Footer */}
      <Footer role="contentinfo">
        <FooterLogo src={Logo} alt="Nomu Cafe Logo" />
        <p>Not just a café. A feeling you'll come back for.</p>
        <p>A place where every sip tells a story, and every visit feels like coming home.</p>
        <p>Crafted with care, rooted in Japanese flavors, and always served with warmth.</p>
        <nav aria-label="Social media links">
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
        </nav>
      </Footer>
    </HomeContainer>
  );
};

export default Home;
