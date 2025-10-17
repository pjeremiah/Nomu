import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaChevronLeft, FaChevronRight, FaTag, FaCalendarAlt, FaClock } from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

// Styled Components
const CarouselContainer = styled.div`
  background: linear-gradient(135deg, 
    ${props => props.theme.bgLight} 0%, 
    ${props => props.theme.bg} 50%, 
    ${props => props.theme.bgLight} 100%
  );
  padding: 2rem 0;
  margin: 2rem 0;
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: ${props => props.theme.isDarkMode 
    ? '0 20px 60px rgba(0, 0, 0, 0.4)' 
    : '0 20px 60px rgba(0, 0, 0, 0.1)'
  };
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 1rem 0;
    margin: 1rem 0;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }
  
  @media (max-width: 480px) {
    padding: 0.8rem 0;
    margin: 0.8rem 0;
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      ${props => props.theme.accent}10 0%, 
      transparent 50%, 
      ${props => props.theme.brand}10 100%
    );
    z-index: 0;
  }

  > * {
    position: relative;
    z-index: 1;
  }
`;

const CarouselHeader = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  padding: 0 1rem;

  h2 {
    font-size: 2.5rem;
    font-weight: 600;
    color: ${props => props.theme.text_primary};
    margin-bottom: 0.5rem;
    font-family: 'Montserrat', sans-serif;
    letter-spacing: -0.5px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.2;
    white-space: normal;
    hyphens: auto;
  }

  p {
    font-size: 1.1rem;
    color: ${props => props.theme.text_secondary};
    font-weight: 400;
    margin: 0;
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.4;
    white-space: normal;
    hyphens: auto;
  }
  
  @media (max-width: 768px) {
    margin-bottom: 2rem;
    padding: 0 0.5rem;
    
    h2 {
      font-size: 2rem;
      line-height: 1.1;
    }
    
    p {
      font-size: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
    padding: 0 0.25rem;
    
    h2 {
      font-size: 1.6rem;
      line-height: 1.1;
      letter-spacing: -0.25px;
    }
    
    p {
      font-size: 0.9rem;
      line-height: 1.3;
    }
  }
`;

const CarouselWrapper = styled.div`
  position: relative;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 6rem;
  
  @media (max-width: 768px) {
    padding: 0 2rem;
    max-width: 100vw;
    overflow: visible;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  @media (max-width: 480px) {
    padding: 0 1rem;
    max-width: 100vw;
    overflow: visible;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
`;

const CarouselBtn = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  color: #b08d57;
  border: 2px solid #b08d57;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  z-index: 10;
  box-shadow: 0 4px 15px rgba(176, 141, 87, 0.3);

  &:hover:not(:disabled) {
    background: #b08d57;
    border-color: #9a7a4a;
    color: white;
    transform: translateY(-50%) scale(1.05);
    box-shadow: 0 6px 20px rgba(176, 141, 87, 0.4);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    display: none; /* Hide navigation buttons on mobile */
  }

  &.prev {
    left: -25px;
  }

  &.next {
    right: -25px;
  }
`;

const CarouselSlides = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: pan-y;
  
  .desktop-carousel {
    display: flex;
    
    @media (max-width: 768px) {
      display: none;
    }
  }
  
  .mobile-carousel {
    display: none;
    
    @media (max-width: 768px) {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      padding: 0 2rem;
    }
    
    @media (max-width: 480px) {
      padding: 0 1rem;
    }
  }
  
  @media (max-width: 768px) {
    height: auto;
    min-height: 400px;
    align-items: center;
    justify-content: center;
    overflow: visible;
    touch-action: pan-y;
    width: 100%;
    display: flex;
  }
  
  @media (max-width: 480px) {
    min-height: 350px;
    overflow: visible;
    touch-action: pan-y;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const SlideContainer = styled.div`
  display: flex;
  transition: ${props => props.$isTransitioning ? 'transform 0.5s ease' : 'none'};
  transform: translateX(calc(50% - 400px - ${props => {
    if (props.$currentIndex === -1) {
      // Duplicate last card at beginning
      return 0;
    } else if (props.$currentIndex === props.$totalPromos) {
      // Duplicate first card at end
      return (props.$totalPromos + 1) * 824;
    } else {
      // Normal cards
      return (props.$currentIndex + 1) * 824;
    }
  }}px));
  height: 100%;
  align-items: center;
  gap: 1.5rem;
  width: max-content;
  
  @media (max-width: 768px) {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    width: 100%;
    transform: none;
    gap: 0;
    height: auto;
  }
`;

const SlideWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  opacity: ${props => props.$isActive ? 1 : 0.4};
  transform: ${props => props.$isActive ? 'scale(1)' : 'scale(0.9)'};
  transition: all 0.4s ease;
  z-index: ${props => props.$isActive ? 2 : 1};
  cursor: pointer;

  &:hover {
    ${props => !props.$isActive && `
      transform: scale(0.95);
      opacity: 0.6;
    `}
  }
  
  @media (max-width: 768px) {
    display: ${props => props.$isActive ? 'flex' : 'none'};
    align-items: flex-start;
    width: 100%;
    max-width: 100%;
    flex-shrink: 0;
    opacity: 1;
    transform: scale(1);
    justify-content: center;
  }
`;

const PromoCard = styled.div`
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(33, 44, 89, 0.15);
  display: flex;
  flex-direction: row;
  height: 320px;
  border: 2px solid #b08d57;
  transition: all 0.3s ease;
  position: relative;
  width: 800px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    flex-direction: column;
    height: auto;
    width: 90vw;
    max-width: 90vw;
    min-height: 480px;
    margin: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
  
  @media (max-width: 480px) {
    width: 85vw;
    max-width: 85vw;
    min-height: 420px;
    margin: 0;
    flex-shrink: 0;
    box-sizing: border-box;
    overflow: hidden;
  }
`;

const PromoImage = styled.div`
  flex: 0 0 50%;
  position: relative;
  overflow: hidden;
  border-radius: 16px 0 0 16px;
  background: linear-gradient(135deg, #b08d57 0%, #c49d67 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: none;

  @media (max-width: 768px) {
    flex: 0 0 50%;
    border-radius: 16px 16px 0 0;
    min-height: 240px;
    max-height: 260px;
  }

  @media (max-width: 480px) {
    flex: 0 0 50%;
    min-height: 210px;
    max-height: 230px;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.3s ease;
    border-radius: 16px 0 0 16px;
    border: none;
    outline: none;

    @media (max-width: 768px) {
      border-radius: 16px 16px 0 0;
    }
  }
`;

const PromoContent = styled.div`
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  color: #2c3e50;
  transition: all 0.3s ease;
  border-radius: 0 16px 16px 0;
  position: relative;
  backdrop-filter: blur(10px);
  height: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media (max-width: 768px) {
    flex: 1;
    border-radius: 0 0 16px 16px;
    padding: 1.5rem;
    min-height: 240px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  
  @media (max-width: 480px) {
    padding: 1.2rem;
    min-height: 210px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
`;

const PromoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #b08d57, #c49d67);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.8rem;
  margin-bottom: 1rem;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(176, 141, 87, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
`;

const PromoTitle = styled.h3`
  font-size: 1.6rem;
  font-weight: 800;
  color: #212c59;
  margin-bottom: 0.6rem;
  font-family: 'Montserrat', sans-serif;
  line-height: 1.2;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-top: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-top: 1rem;
    line-height: 1.1;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
    margin-top: 0.8rem;
  }
`;

const PromoDescription = styled.p`
  font-size: 0.9rem;
  color: #7a8a9a;
  line-height: 1.5;
  margin-bottom: 1rem;
  font-weight: 400;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    margin-bottom: 0.8rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
    margin-bottom: 0.6rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }
`;

const PromoDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  @media (max-width: 768px) {
    gap: 4px;
  }
  
  @media (max-width: 480px) {
    gap: 3px;
  }
`;

const PromoDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7a8a9a;
  font-size: 0.85rem;
  font-weight: 500;

  svg {
    color: #b08d57;
    font-size: 1rem;
  }
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
    gap: 6px;
    
    svg {
      font-size: 0.9rem;
    }
  }
  
  @media (max-width: 480px) {
    font-size: 0.75rem;
    gap: 5px;
    
    svg {
      font-size: 0.8rem;
    }
  }
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 2rem;
`;

const Dot = styled.button`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: ${props => props.$active ? '#b08d57' : '#d1d5db'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.$active ? '#c49d67' : '#9ca3af'};
    transform: scale(1.2);
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.text_secondary};
  transition: color 0.3s ease;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 3rem;
  color: ${props => props.theme.red || '#ef5350'};
  transition: color 0.3s ease;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid ${props => props.theme.text_primary};
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
  transition: border-color 0.3s ease;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const PromoCarousel = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  useEffect(() => {
    fetchActivePromos();
  }, []);

  useEffect(() => {
    // Only auto-play if there are multiple promos
    if (promos.length <= 1 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      // Use the same smooth transition logic as manual navigation
      if (isTransitioning) return;
      setIsTransitioning(true);
      
      if (currentIndex === promos.length - 1) {
        // Going from last to first - infinite loop
        setCurrentIndex(0);
        setTimeout(() => setIsTransitioning(false), 500);
      } else {
        setCurrentIndex(currentIndex + 1);
        setTimeout(() => setIsTransitioning(false), 500);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [promos.length, isAutoPlaying, currentIndex, isTransitioning]);

  const fetchActivePromos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE}/api/promos/active`);
      
      if (response.ok) {
        const data = await response.json();
        setPromos(data);
      } else {
        setError('Failed to load promos');
      }
    } catch (err) {
      setError('Error loading promos');
    } finally {
      setLoading(false);
    }
  };

  const getDiscountText = (promo) => {
    switch (promo.promoType) {
      case "Percentage Discount":
        return `${promo.discountValue}% OFF`;
      case "Fixed Amount Discount":
        return `₱${Number(promo.discountValue).toLocaleString()} OFF`;
      case "Buy One Get One":
        return "BOGO";
      case "Free Item":
        return `FREE ITEM`;
      case "Loyalty Points Bonus":
        return `${promo.discountValue}X POINTS`;
      default:
        return promo.discountValue;
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const nextSlide = () => {
    if (isTransitioning) return;
    setIsAutoPlaying(false);
    setIsTransitioning(true);
    
    if (currentIndex === promos.length - 1) {
      // Going from last to first - infinite loop
      setCurrentIndex(0);
      setTimeout(() => setIsTransitioning(false), 500);
    } else {
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setIsAutoPlaying(false);
    setIsTransitioning(true);
    
    if (currentIndex === 0) {
      // Going from first to last - infinite loop
      setCurrentIndex(promos.length - 1);
      setTimeout(() => setIsTransitioning(false), 500);
    } else {
      setCurrentIndex(currentIndex - 1);
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  const goToSlide = (index) => {
    setIsAutoPlaying(false); // Stop auto-play when user interacts
    setCurrentIndex(index);
  };

  // Touch handlers for mobile swipe functionality
  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (promos.length <= 1) return; // No need to swipe if only one promo

    const minSwipeDistance = 50; // Minimum distance for a swipe to be registered
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    // Reset touch positions
    setTouchStartX(0);
    setTouchEndX(0);
  };


  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner />
        <p>Loading promotions...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <p>Unable to load promotions</p>
      </ErrorContainer>
    );
  }

  if (promos.length === 0) {
    return null; // Don't show carousel if no promos
  }

  // Special handling for single promo - show it without carousel controls
  if (promos.length === 1) {
    return (
      <CarouselContainer>
        <CarouselHeader>
          <h2>Special Offers</h2>
          <p>Discover our latest promotions and exclusive deals</p>
        </CarouselHeader>

        <CarouselWrapper>
          <CarouselSlides>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'flex-start',
              width: '100%',
              minHeight: 'auto',
              padding: '20px 10px',
              boxSizing: 'border-box'
            }}>
              <PromoCard>
                {promos[0].imageUrl && (
                  <PromoImage>
                    <img 
                      src={`${API_BASE}${promos[0].imageUrl}`} 
                      alt={promos[0].title}
                    />
                  </PromoImage>
                )}
                
                <PromoContent>
                  <PromoBadge>
                    <span>{getDiscountText(promos[0])}</span>
                  </PromoBadge>
                  
                  <PromoTitle>{promos[0].title}</PromoTitle>
                  <PromoDescription>{promos[0].description}</PromoDescription>
                  
                  <PromoDetails>
                    <PromoDetail>
                      <FaCalendarAlt />
                      <span>
                        {formatDate(promos[0].startDate)} - {formatDate(promos[0].endDate)}
                      </span>
                    </PromoDetail>
                    
                    {promos[0].minOrderAmount > 0 && (
                      <PromoDetail>
                        <FaClock />
                        <span>Min. order: ₱{Number(promos[0].minOrderAmount).toLocaleString()}</span>
                      </PromoDetail>
                    )}
                  </PromoDetails>
                </PromoContent>
              </PromoCard>
            </div>
          </CarouselSlides>
        </CarouselWrapper>
      </CarouselContainer>
    );
  }

  return (
    <CarouselContainer>
      <CarouselHeader>
        <h2>Special Offers</h2>
        <p>Discover our latest promotions and exclusive deals</p>
      </CarouselHeader>

      <CarouselWrapper
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CarouselBtn 
          className="prev" 
          onClick={prevSlide}
          disabled={promos.length <= 1}
        >
          <FaChevronLeft />
        </CarouselBtn>
        
        <CarouselBtn 
          className="next" 
          onClick={nextSlide}
          disabled={promos.length <= 1}
        >
          <FaChevronRight />
        </CarouselBtn>

        <CarouselSlides>
          {/* Desktop carousel with all cards */}
          <SlideContainer 
            $currentIndex={currentIndex} 
            $totalPromos={promos.length}
            $isTransitioning={isTransitioning}
            className="desktop-carousel"
          >
            {/* Last promo at the beginning for infinite loop */}
            {promos.length > 1 && (
              <SlideWrapper 
                key={`last-${promos[promos.length - 1]._id}`}
                $isActive={false}
                onClick={() => goToSlide(promos.length - 1)}
                style={{ cursor: 'pointer' }}
              >
                <PromoCard>
                  {promos[promos.length - 1].imageUrl && (
                    <PromoImage>
                      <img 
                        src={`${API_BASE}${promos[promos.length - 1].imageUrl}`} 
                        alt={promos[promos.length - 1].title}
                      />
                    </PromoImage>
                  )}
                  
                  <PromoContent>
                    <PromoBadge>
                      <span>{getDiscountText(promos[promos.length - 1])}</span>
                    </PromoBadge>
                    
                    <PromoTitle>{promos[promos.length - 1].title}</PromoTitle>
                    <PromoDescription>{promos[promos.length - 1].description}</PromoDescription>
                    
                    <PromoDetails>
                      <PromoDetail>
                        <FaCalendarAlt />
                        <span>
                          {formatDate(promos[promos.length - 1].startDate)} - {formatDate(promos[promos.length - 1].endDate)}
                        </span>
                      </PromoDetail>
                      
                      {promos[promos.length - 1].minOrderAmount > 0 && (
                        <PromoDetail>
                          <FaClock />
                          <span>Min. order: ₱{Number(promos[promos.length - 1].minOrderAmount).toLocaleString()}</span>
                        </PromoDetail>
                      )}
                    </PromoDetails>
                  </PromoContent>
                </PromoCard>
              </SlideWrapper>
            )}

            {/* All promos */}
            {promos.map((promo, index) => (
              <SlideWrapper 
                key={promo._id}
                $isActive={index === currentIndex}
                onClick={() => goToSlide(index)}
                style={{ cursor: 'pointer' }}
              >
                <PromoCard>
                  {promo.imageUrl && (
                    <PromoImage>
                      <img 
                        src={`${API_BASE}${promo.imageUrl}`} 
                        alt={promo.title}
                      />
                    </PromoImage>
                  )}
                  
                  <PromoContent>
                    <PromoBadge>
                      <span>{getDiscountText(promo)}</span>
                    </PromoBadge>
                    
                    <PromoTitle>{promo.title}</PromoTitle>
                    <PromoDescription>{promo.description}</PromoDescription>
                    
                    <PromoDetails>
                      <PromoDetail>
                        <FaCalendarAlt />
                        <span>
                          {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                        </span>
                      </PromoDetail>
                      
                      {promo.minOrderAmount > 0 && (
                        <PromoDetail>
                          <FaClock />
                          <span>Min. order: ₱{Number(promo.minOrderAmount).toLocaleString()}</span>
                        </PromoDetail>
                      )}
                    </PromoDetails>
                  </PromoContent>
                </PromoCard>
              </SlideWrapper>
            ))}

            {/* First promo at the end for infinite loop */}
            {promos.length > 1 && (
              <SlideWrapper 
                key={`first-${promos[0]._id}`}
                $isActive={false}
                onClick={() => goToSlide(0)}
                style={{ cursor: 'pointer' }}
              >
                <PromoCard>
                  {promos[0].imageUrl && (
                    <PromoImage>
                      <img 
                        src={`${API_BASE}${promos[0].imageUrl}`} 
                        alt={promos[0].title}
                      />
                    </PromoImage>
                  )}
                  
                  <PromoContent>
                    <PromoBadge>
                      <span>{getDiscountText(promos[0])}</span>
                    </PromoBadge>
                    
                    <PromoTitle>{promos[0].title}</PromoTitle>
                    <PromoDescription>{promos[0].description}</PromoDescription>
                    
                    <PromoDetails>
                      <PromoDetail>
                        <FaCalendarAlt />
                        <span>
                          {formatDate(promos[0].startDate)} - {formatDate(promos[0].endDate)}
                        </span>
                      </PromoDetail>
                      
                      {promos[0].minOrderAmount > 0 && (
                        <PromoDetail>
                          <FaClock />
                          <span>Min. order: ₱{Number(promos[0].minOrderAmount).toLocaleString()}</span>
                        </PromoDetail>
                      )}
                    </PromoDetails>
                  </PromoContent>
                </PromoCard>
              </SlideWrapper>
            )}
          </SlideContainer>

          {/* Mobile carousel - only show current card */}
          <div 
            className="mobile-carousel"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <PromoCard>
              {promos[currentIndex]?.imageUrl && (
                <PromoImage>
                  <img 
                    src={`${API_BASE}${promos[currentIndex].imageUrl}`} 
                    alt={promos[currentIndex].title}
                  />
                </PromoImage>
              )}
              
              <PromoContent>
                <PromoBadge>
                  <span>{getDiscountText(promos[currentIndex])}</span>
                </PromoBadge>
                
                <PromoTitle>{promos[currentIndex]?.title}</PromoTitle>
                <PromoDescription>{promos[currentIndex]?.description}</PromoDescription>
                
                <PromoDetails>
                  <PromoDetail>
                    <FaCalendarAlt />
                    <span>
                      {formatDate(promos[currentIndex]?.startDate)} - {formatDate(promos[currentIndex]?.endDate)}
                    </span>
                  </PromoDetail>
                  
                  {promos[currentIndex]?.minOrderAmount > 0 && (
                    <PromoDetail>
                      <FaClock />
                      <span>Min. order: ₱{Number(promos[currentIndex]?.minOrderAmount).toLocaleString()}</span>
                    </PromoDetail>
                  )}
                </PromoDetails>
              </PromoContent>
            </PromoCard>
          </div>
        </CarouselSlides>

        {promos.length > 1 && (
          <DotsContainer>
            {promos.map((_, index) => (
              <Dot
                key={index}
                $active={index === currentIndex}
                onClick={() => goToSlide(index)}
              />
            ))}
          </DotsContainer>
        )}
      </CarouselWrapper>
    </CarouselContainer>
  );
};

export default PromoCarousel;
