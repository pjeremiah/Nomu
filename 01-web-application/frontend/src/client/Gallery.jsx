import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { lightTheme } from '../utils/Themes';
import { FaFacebookF, FaInstagram, FaTiktok, FaPlay, FaImages, FaTimes } from 'react-icons/fa';
import Logo from '../utils/Images/Logo.png';
import ForGalleryPageImage from '../utils/Images/Gallery/ForGalleryPage.jpg';

const GalleryContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  
  /* Custom scrollbar for webkit browsers */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #b08d57;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #9a7a4a;
  }
`;

const GalleryHeader = styled.div`
  position: relative;
  height: 50vh;
  overflow: hidden;
  animation: fadeIn 1s ease forwards;
`;

const GalleryHeroImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
`;

const GalleryHeroOverlay = styled.div`
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
`;

const GalleryTitle = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 10px;
  text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const GallerySubtitle = styled.p`
  font-size: 1.2rem;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const GalleryContent = styled.div`
  background: ${props => props.theme.bgLight};
  padding: 80px 0;
  min-height: 100vh;
  position: relative;
  z-index: 10;
`;

const GalleryGrid = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
  }
`;

const GallerySlot = styled.div`
  background: white;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  aspect-ratio: 1;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10;
  }
`;

const SlotMedia = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SlotImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
  
  ${GallerySlot}:hover & {
    transform: scale(1.05);
  }
`;

const SlotVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlayIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
  
  ${GallerySlot}:hover & {
    background: rgba(0, 0, 0, 0.9);
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

const MediaCountBadge = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: 15px;
  left: 15px;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #333;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
`;

const EmptySlot = styled.div`
  background: #f8f9fa;
  border: 2px dashed #dee2e6;
  border-radius: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  text-align: center;
  padding: 20px;
  aspect-ratio: 1;
`;

const EmptyIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 10px;
  opacity: 0.5;
`;

const EmptyText = styled.p`
  font-size: 0.9rem;
  margin: 0;
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #b08d57;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #dc3545;
`;

const ErrorIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
`;

const ErrorText = styled.p`
  font-size: 1.1rem;
  margin: 0;
`;

// Modal styles
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 15px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
`;

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ModalTitle = styled.h3`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f8f9fa;
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
`;

const MediaCarousel = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 10px;
`;

const MediaItem = styled.div`
  min-width: 200px;
  height: 200px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  background: #f8f9fa;
`;

const CarouselImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const CarouselVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const MediaPlayIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
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

const Gallery = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

  useEffect(() => {
    fetchGalleryPosts();
  }, []);

  const fetchGalleryPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/gallery/client`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch gallery posts');
      }

      const data = await response.json();
      setPosts(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPost(null);
  };

  const renderMedia = (media, isModal = false) => {
    if (media.type === 'video') {
      return (
        <>
          {isModal ? (
            <CarouselVideo controls>
              <source src={`${API_BASE}${media.url}`} type={media.mimetype} />
            </CarouselVideo>
          ) : (
            <SlotVideo controls>
              <source src={`${API_BASE}${media.url}`} type={media.mimetype} />
            </SlotVideo>
          )}
          <PlayIcon>
            <FaPlay />
          </PlayIcon>
        </>
      );
    } else {
      return (
        <SlotImage 
          src={`${API_BASE}${media.url}`} 
          alt={media.originalName}
        />
      );
    }
  };

  const renderGallerySlots = () => {
    const slots = [];
    
    // Add actual posts (up to 12 for 3x4 grid)
    for (let i = 0; i < 12; i++) {
      const post = posts[i];
      
      if (post) {
        slots.push(
          <GallerySlot key={post._id} onClick={() => handlePostClick(post)}>
            <SlotMedia>
              {renderMedia(post.media[0])}
              
              {post.media.length > 1 && (
                <MediaCountBadge>
                  <FaImages />
                  {post.media.length}
                </MediaCountBadge>
              )}
              
              {post.featured && (
                <FeaturedBadge>Featured</FeaturedBadge>
              )}
            </SlotMedia>
          </GallerySlot>
        );
      } else {
        // Empty slot
        slots.push(
          <EmptySlot key={`empty-${i}`}>
            <EmptyIcon>📸</EmptyIcon>
            <EmptyText>Coming Soon</EmptyText>
          </EmptySlot>
        );
      }
    }
    
    return slots;
  };

  return (
    <GalleryContainer>
      <GalleryHeader>
        <GalleryHeroImage src={ForGalleryPageImage} alt="Nomu Cafe Gallery Hero" />
        <GalleryHeroOverlay>
          <GalleryTitle>OUR GALLERY</GalleryTitle>
          <GallerySubtitle>
            Discover the beauty of Nomu Cafe through our collection of drinks, pastries, and cozy ambiance
          </GallerySubtitle>
        </GalleryHeroOverlay>
      </GalleryHeader>

      <GalleryContent>
        {loading ? (
          <LoadingContainer>
            <LoadingSpinner />
          </LoadingContainer>
        ) : error ? (
          <ErrorContainer>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorText>{error}</ErrorText>
          </ErrorContainer>
        ) : (
          <GalleryGrid>
            {renderGallerySlots()}
          </GalleryGrid>
        )}
      </GalleryContent>

      {/* Post Detail Modal */}
      {showModal && selectedPost && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedPost.title}</ModalTitle>
              <CloseButton onClick={closeModal}>
                <FaTimes />
              </CloseButton>
            </ModalHeader>
            
            <ModalBody>
              {selectedPost.description && (
                <p style={{ marginBottom: '20px', color: '#666' }}>
                  {selectedPost.description}
                </p>
              )}
              
              {selectedPost.tags && selectedPost.tags.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  {selectedPost.tags.map((tag, index) => (
                    <span key={index} style={{
                      display: 'inline-block',
                      background: '#e9ecef',
                      color: '#495057',
                      padding: '4px 12px',
                      borderRadius: '15px',
                      fontSize: '0.8rem',
                      marginRight: '8px',
                      marginBottom: '4px'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              <MediaCarousel>
                {selectedPost.media.map((media, index) => (
                  <MediaItem key={index}>
                    {media.type === 'video' ? (
                      <>
                        <CarouselVideo controls>
                          <source src={`${API_BASE}${media.url}`} type={media.mimetype} />
                        </CarouselVideo>
                        <MediaPlayIcon>
                          <FaPlay />
                        </MediaPlayIcon>
                      </>
                    ) : (
                      <CarouselImage 
                        src={`${API_BASE}${media.url}`} 
                        alt={`Media ${index + 1}`}
                      />
                    )}
                  </MediaItem>
                ))}
              </MediaCarousel>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '15px',
                borderTop: '1px solid #e9ecef',
                fontSize: '0.9rem',
                color: '#666'
              }}>
                <span>
                  {selectedPost.media.length} {selectedPost.media.length === 1 ? 'item' : 'items'}
                </span>
                <span>
                  {new Date(selectedPost.createdAt).toLocaleDateString()}
                </span>
              </div>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}

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
    </GalleryContainer>
  );
};

export default Gallery;