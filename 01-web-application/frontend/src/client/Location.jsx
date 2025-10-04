import React from 'react';
import { FaFacebookF, FaInstagram, FaTiktok, FaMapMarkerAlt, FaClock } from 'react-icons/fa';
import styled from 'styled-components';
import { useTheme } from 'styled-components';
import Logo from '../utils/Images/Logo.png';
import nomuUSTDapitanImg from '../utils/Images/Nomu Cafe Branches/NomuUSTDapitan.jpg';
import nomuMakatiImg from '../utils/Images/Nomu Cafe Branches/NomuJupiterMakati.png';
import nomuBGCImg from '../utils/Images/Nomu Cafe Branches/NomuUPD.jpg';
import ForLocationPageImg from '../utils/Images/Location/ForLocationPage.jpg';

// Styled Components
const LocationContainer = styled.div`
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

const LocationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 40px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;

  @media (max-width: 1200px) {
    max-width: 1200px;
    gap: 30px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 25px;
    padding: 0 15px;
  }

  @media (max-width: 480px) {
    padding: 0 10px;
    gap: 20px;
  }
`;

const LocationCard = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #b08d57, #d4af37, #b08d57);
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);

    &::before {
      transform: scaleX(1);
    }
  }

  img {
    width: 100%;
    height: 280px;
    object-fit: cover;
    transition: transform 0.3s ease;
  }

  &:hover img {
    transform: scale(1.05);
  }

  h3 {
    font-size: 1.6rem;
    font-weight: 700;
    color: ${props => props.theme.brand};
    margin: 25px 25px 15px;
    letter-spacing: 0.3px;

    @media (max-width: 768px) {
      font-size: 1.4rem;
      margin: 20px 20px 12px;
    }
  }

  p {
    font-size: 1.05rem;
    line-height: 1.7;
    color: ${props => props.theme.text_secondary};
    margin: 0 25px 25px;
    font-weight: 400;

    @media (max-width: 768px) {
      font-size: 1rem;
      margin: 0 20px 20px;
    }
  }
`;

const LocationButton = styled.button`
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  padding: 14px 28px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  margin: 0 25px 25px;
  font-family: 'Montserrat', sans-serif;
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
    transition: left 0.5s ease;
  }

  &:hover {
    background: #b08d57;
    color: white;
    border: 2px solid #9a7a4a;
    transform: translateY(-3px);
    box-shadow: 0 12px 30px rgba(176, 141, 87, 0.4);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    padding: 12px 24px;
    font-size: 0.9rem;
    margin: 0 20px 20px;
  }
`;

const LocationDetails = styled.div`
  margin: 0 25px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    margin: 0 20px 15px;
    gap: 10px;
  }
`;

const DetailItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: ${props => props.theme.text_secondary};
  font-weight: 500;

  svg {
    color: #b08d57;
    font-size: 1rem;
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
    gap: 8px;
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

const branches = [
  {
    name: 'Nomu Café - Dapitan',
    description: 'Near UST Dapitan Lacson. Enjoy our classic tea, pastries, and cozy atmosphere!',
    address: 'Dapitan St, Sampaloc, Manila',
    hours: '7:00 AM - 10:00 PM',
    mapsUrl: 'https://www.google.com/maps/place/Nomu+Cafe+UST+Dapitan/@14.6132341,120.9871252,17z/data=!3m1!4b1!4m6!3m5!1s0x3397b74137351629:0xe7a4f1bfec4c8683!8m2!3d14.6132289!4d120.9897001!16s%2Fg%2F11lzks1sn2?entry=ttu',
    imageUrl: nomuUSTDapitanImg,
  },
  {
    name: 'Nomu Café - Jupiter',
    description: 'Located in the heart of Makati. A peaceful spot for professionals and students.',
    address: 'Jupiter St, Bel-Air, Makati',
    hours: '6:30 AM - 11:00 PM',
    mapsUrl: 'https://www.google.com/maps/place/Nomu+Cafe+Jupiter/@14.5629673,121.022699,17z/data=!3m1!4b1!4m6!3m5!1s0x3397c9ab955ccbaf:0x296060109e5f9f2e!8m2!3d14.5629621!4d121.0252739!16s%2Fg%2F11rzqxwrwp?entry=ttu',
    imageUrl: nomuMakatiImg,
  },
  {
    name: 'Nomu Café - UPD',
    description: 'Stylish ambiance and premium brews at our University of the Philippines Diliman branch.',
    address: 'University Ave, Diliman, Quezon City',
    hours: '6:00 AM - 12:00 AM',
    mapsUrl: 'https://www.google.com/maps/place/Nomu+Cafe+UPD/@14.6582751,121.0646193,17z/data=!3m1!4b1!4m6!3m5!1s0x3397b70cafba59f5:0xe4636129e8c7ea9f!8m2!3d14.6582699!4d121.0671942!16s%2Fg%2F11fhz4q9s7?entry=ttu',
    imageUrl: nomuBGCImg,
  },
];

const Location = () => {
  const theme = useTheme();
  return (
    <LocationContainer>
      {/* Hero Section */}
      <HeroSection>
        <HeroImage
          src={ForLocationPageImg}
          alt="Nomu Cafe Location Hero"
        />
        <HeroOverlay>
          <h1>LOCATION</h1>
          <p>Explore our cozy locations across Dapitan, Makati, and Diliman.</p>
        </HeroOverlay>
      </HeroSection>

      {/* Branch Cards */}
      <ContentSection>
        <LocationGrid>
          {branches.map((branch, index) => (
            <LocationCard key={index}>
              <img 
                src={branch.imageUrl} 
                alt={branch.name} 
              />
              <h3>{branch.name}</h3>
              <p>{branch.description}</p>
              <LocationDetails>
                <DetailItem>
                  <FaMapMarkerAlt />
                  <span>{branch.address}</span>
                </DetailItem>
                <DetailItem>
                  <FaClock />
                  <span>{branch.hours}</span>
                </DetailItem>
              </LocationDetails>
              <LocationButton 
                onClick={() => window.open(branch.mapsUrl, '_blank')}
              >
                Visit Store
              </LocationButton>
            </LocationCard>
          ))}
        </LocationGrid>
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
    </LocationContainer>
  );
};

export default Location;