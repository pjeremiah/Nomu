import React from 'react';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import Logo from '../utils/Images/Logo.png';
import ForAboutUsPageImg from '../utils/Images/About Us/ForAboutUsPage.png';
import ForAboutUsStoryImg from '../utils/Images/About Us/ForAboutUsStory.jpg';
import MissionImage from '../utils/Images/About Us/ForMission.jpg';
import VisionImage from '../utils/Images/About Us/ForVision.jpg';

// Styled Components
const AboutContainer = styled.main`
  font-family: 'Montserrat', sans-serif;
`;

const HeroSection = styled.section`
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
`;

const MissionVisionSection = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  margin-bottom: 100px;
  max-width: 1600px;
  margin-left: auto;
  margin-right: auto;
  padding: 0 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 40px;
  }
`;

const MissionVisionBox = styled.article`
  background: #ffffff;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .image-container {
    position: relative;
    height: 300px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  }

  .content {
    padding: 40px 50px 50px;
    position: relative;
  }

  h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #212c59;
    margin-bottom: 25px;
    text-align: center;
    letter-spacing: 0.5px;
  }

  p {
    font-size: 1.2rem;
    line-height: 1.8;
    color: #6c757d;
    text-align: center;
    font-weight: 400;
    margin-bottom: 22px;
  }

  &:hover .image-container img {
    transform: scale(1.02);
  }
`;

const StorySection = styled.section`
  max-width: 1600px;
  margin: 0 auto 80px;
  padding: 0 20px;
`;

const StoryText = styled.div`
  background: #ffffff;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }

  .image-container {
    position: relative;
    height: 300px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
  }

  .content {
    padding: 40px 50px 50px;
    position: relative;
  }

  h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #212c59;
    margin-bottom: 25px;
    text-align: center;
    letter-spacing: 0.5px;
  }

  p {
    font-size: 1.2rem;
    line-height: 1.8;
    color: #6c757d;
    margin-bottom: 22px;
    font-weight: 400;
    text-align: center;
  }

  &:hover .image-container img {
    transform: scale(1.02);
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

const AboutUs = () => {
  const theme = useTheme();
  return (
    <AboutContainer>
      {/* Hero Section */}
      <HeroSection>
        <HeroImage src={ForAboutUsPageImg} alt="Nomu Cafe cozy interior" />
        <HeroOverlay>
          <h1>ABOUT US</h1>
          <p>From humble beginnings to your favorite corner café get to know Nomu.</p>
        </HeroOverlay>
      </HeroSection>

      {/* Content Section */}
      <ContentSection>
        {/* Mission & Vision Section */}
        <MissionVisionSection>
          {/* Mission */}
          <MissionVisionBox>
            <div className="image-container">
              <img src={MissionImage} alt="Mission visual" />
            </div>
            <div className="content">
              <h2>MISSION</h2>
              <p>
                At Nomu Cafe, we are committed to precision and freshness, crafting high-quality coffee, pastries, and pizzas with time-honored techniques and a modern touch.
                Rooted in Japanese principles, we create a minimalist yet welcoming space where students and professionals can refresh, re-energize, and indulge in freshly made flavors at an accessible price.
              </p>
            </div>
          </MissionVisionBox>

          {/* Vision */}
          <MissionVisionBox>
            <div className="image-container">
              <img src={VisionImage} alt="Vision visual" />
            </div>
            <div className="content">
              <h2>VISION</h2>
              <p>
                To become a top-of-mind destination for those seeking refreshment, energy, and satisfaction - growing into a recognized brand with multiple locations while maintaining the warmth and quality of a local favorite.
                Through artisanal craftsmanship and freshly crafted offerings, we aim to set a new standard in the café experience.
              </p>
            </div>
          </MissionVisionBox>
        </MissionVisionSection>

        {/* Story Section */}
        <StorySection>
          <StoryText>
            <div className="image-container">
              <img src={ForAboutUsStoryImg} alt="Nomu Cafe story ambiance" />
            </div>
            <div className="content">
              <h2>STORY</h2>
              <p>
                Nomu Café began with a love for Japanese culture and the cozy charm of café life. Before opening near UST Dapitan, we launched two smaller branches that shaped our identity with warmth, authenticity, and quality.
              </p>
              <p>
                We started with handcrafted drinks and physical loyalty cards, then evolved into a digital experience with seamless ordering and virtual rewards. Despite the changes, we remain rooted in Japanese coffee culture and Filipino hospitality.
              </p>
              <p>
                Whether you're studying, relaxing, or catching up with friends, Nomu Café offers a cozy corner just for you. Each visit is a taste of Japan and a moment to be part of the Nomu story.
              </p>
            </div>
          </StoryText>
        </StorySection>
      </ContentSection>

      {/* Footer Section */}
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
    </AboutContainer>
  );
};

export default AboutUs;
