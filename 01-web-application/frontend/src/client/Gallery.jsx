import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { lightTheme } from '../utils/Themes';
import { FaFacebookF, FaInstagram, FaTiktok, FaPlay, FaImages, FaTimes, FaHeart, FaComment, FaShare, FaBookmark, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Logo from '../utils/Images/Logo.png';
import ForGalleryPageImage from '../utils/Images/Gallery/ForGalleryPage.jpg';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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

// Instagram-style Modal styles
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
  
  @media (max-width: 768px) {
    /* Mobile-specific improvements */
    width: 100vw !important;
    height: 100vh !important;
    overflow: hidden !important;
    touch-action: none !important;
    overscroll-behavior: none !important;
    padding: 0 !important;
  }
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  display: flex;
  width: 100%;
  max-width: 1000px;
  height: 80vh;
  
  @media (max-width: 768px) {
    /* Mobile-specific improvements */
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
    flex-direction: column !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-y !important;
  }
`;

const MediaSection = styled.div`
  flex: 1;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MediaContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MainMedia = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const MainVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const VideoPlayIcon = styled.div`
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
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
    transform: translate(-50%, -50%) scale(1.1);
  }
`;

// Inner navigation arrows (for multiple media in same post)
const InnerNavButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  color: #333;
  transition: all 0.3s ease;
  z-index: 10;
  
  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-50%) scale(1.1);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const InnerLeftArrow = styled(InnerNavButton)`
  left: 15px;
`;

const InnerRightArrow = styled(InnerNavButton)`
  right: 15px;
`;

// Outer navigation arrows (for different posts)
const OuterNavButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  color: #333;
  transition: all 0.3s ease;
  z-index: 20;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  
  &:hover {
    background: white;
    transform: translateY(-50%) scale(1.1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const OuterLeftArrow = styled(OuterNavButton)`
  left: -60px;
`;

const OuterRightArrow = styled(OuterNavButton)`
  right: -60px;
`;

const DetailsSection = styled.div`
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 1px solid #e9ecef;
`;

const DetailsHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Username = styled.div`
  font-weight: 600;
  font-size: 14px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s ease;
  
  &:hover {
    opacity: 0.7;
  }
`;

const InstagramIcon = styled.div`
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, #f58529 0%, #dd2a7b 50%, #8134af 100%);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 3px;
    top: 2px;
    left: 2px;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: 6px;
  }
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(221, 42, 123, 0.3);
  }
`;

const VerifiedBadge = styled.span`
  color: #0095f6;
  font-size: 16px;
  margin-left: 4px;
`;

// Close button styled to match sign-in modal
const CloseButton = styled.button`
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
  font-weight: 600;
  
  &:hover {
    background: #212c59;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }
`;

const DetailsBody = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const Caption = styled.div`
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  margin-bottom: 10px;
`;

const Hashtags = styled.div`
  font-size: 14px;
  color: #00376b;
  margin-bottom: 10px;
`;

const Timestamp = styled.div`
  font-size: 12px;
  color: #8e8e8e;
  text-transform: uppercase;
  margin-bottom: 15px;
`;

const Engagement = styled.div`
  font-size: 14px;
  color: #333;
  margin-bottom: 15px;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 15px;
  padding: 15px 0;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #333;
  cursor: pointer;
  padding: 5px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #0095f6;
    transform: scale(1.1);
  }
`;

const PostActions = styled.div`
  display: flex;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #e9ecef;
`;

const PostActionButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  color: #333;
  cursor: pointer;
  padding: 5px;
  transition: all 0.2s ease;
  
  &:hover {
    color: #0095f6;
    transform: scale(1.1);
  }
`;

const CommentInput = styled.div`
  padding: 15px 0;
  border-top: 1px solid #e9ecef;
  margin-top: 15px;
`;

const CommentField = styled.input`
  width: 100%;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
  
  &::placeholder {
    color: #999;
  }
`;

const CommentsSection = styled.div`
  margin: 15px 0;
  max-height: 200px;
  overflow-y: auto;
`;

const CommentItem = styled.div`
  margin-bottom: 12px;
`;

const CommentUser = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const CommentAvatar = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CommentContent = styled.div`
  flex: 1;
`;

const CommentText = styled.div`
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  
  strong {
    font-weight: 600;
    margin-right: 5px;
  }
`;

const CommentTime = styled.div`
  font-size: 12px;
  color: #999;
  margin-top: 2px;
`;

const ViewMoreComments = styled.div`
  font-size: 14px;
  color: #999;
  cursor: pointer;
  margin-top: 8px;
  
  &:hover {
    color: #666;
  }
`;

const MediaIndicator = styled.div`
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  z-index: 10;
`;

const Dot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.5)'};
  transition: all 0.3s ease;
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
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  
  // Engagement state
  const [engagementStats, setEngagementStats] = useState({});
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [userLiked, setUserLiked] = useState({});
  const [newComment, setNewComment] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  
  // Use global auth context
  const { isAuthenticated, checkAuthentication, login } = useAuth();

  const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

  useEffect(() => {
    fetchGalleryPosts();
  }, []);

  useEffect(() => {
    if (selectedPost) {
      fetchEngagementStats(selectedPost._id);
      fetchComments(selectedPost._id);
      fetchLikes(selectedPost._id);
    }
  }, [selectedPost, isAuthenticated]);

  // Handle body class for modal consistency and scroll prevention
  useEffect(() => {
    if (showModal || showSignInModal || showSignUpModal) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [showModal, showSignInModal, showSignUpModal]);

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

  // Helper function to wait for token to be stored
  const waitForToken = async (maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('✅ Token found after', i + 1, 'attempts');
        return true;
      }
      console.log('⏳ Waiting for token, attempt', i + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('❌ Token not found after', maxAttempts, 'attempts');
    return false;
  };

  const fetchEngagementStats = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/stats/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEngagementStats(prev => ({
          ...prev,
          [postId]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
    }
  };

  const fetchComments = async (postId) => {
    try {
      const response = await fetch(`${API_BASE}/api/engagement/comments/${postId}`);
      
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [postId]: data.comments
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchLikes = async (postId) => {
    try {
      const response = await fetch(`${API_BASE}/api/engagement/likes/${postId}`);
      
      if (response.ok) {
        const data = await response.json();
        setLikes(prev => ({
          ...prev,
          [postId]: data.likes
        }));
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/like/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEngagementStats(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            likeCount: data.likeCount,
            userLiked: data.liked
          }
        }));
        setUserLiked(prev => ({
          ...prev,
          [postId]: data.liked
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async (postId) => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    

    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/comment/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [postId]: [data.comment, ...(prev[postId] || [])]
        }));
        setEngagementStats(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            commentCount: (prev[postId]?.commentCount || 0) + 1
          }
        }));
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d`;
    } else if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months}mo`;
    } else {
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years}y`;
    }
  };

  const handlePostClick = (post, postIndex) => {
    setSelectedPost(post);
    setCurrentPostIndex(postIndex);
    setCurrentMediaIndex(0);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPost(null);
    setCurrentMediaIndex(0);
    setCurrentPostIndex(0);
  };

  const nextMedia = () => {
    if (selectedPost && currentMediaIndex < selectedPost.media.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  const nextPost = () => {
    if (currentPostIndex < posts.length - 1) {
      const nextIndex = currentPostIndex + 1;
      setCurrentPostIndex(nextIndex);
      setSelectedPost(posts[nextIndex]);
      setCurrentMediaIndex(0);
    }
  };

  const prevPost = () => {
    if (currentPostIndex > 0) {
      const prevIndex = currentPostIndex - 1;
      setCurrentPostIndex(prevIndex);
      setSelectedPost(posts[prevIndex]);
      setCurrentMediaIndex(0);
    }
  };

  const renderMedia = (media, isModal = false) => {
    if (media.type === 'video') {
      return (
        <>
          {isModal ? (
            <MainVideo controls>
              <source src={`${API_BASE}${media.url}`} type={media.mimetype} />
            </MainVideo>
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
          <GallerySlot key={post._id} onClick={() => handlePostClick(post, i)}>
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
          {/* Debug button - remove in production */}
          <button 
            onClick={() => {
              console.log('🔧 Manual auth check triggered');
              const result = checkAuthentication(true);
              console.log('🔧 Manual auth check result:', result);
              console.log('🔧 Current isAuthenticated state:', isAuthenticated);
              console.log('🔧 Token in localStorage:', !!localStorage.getItem('token'));
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#212c59',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              zIndex: 1000
            }}
          >
            Debug Auth
          </button>
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

      {/* Instagram-style Post Detail Modal */}
      {showModal && selectedPost && (
        <ModalOverlay>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            {/* Left Side - Media Section */}
            <MediaSection>
              <MediaContainer>
                <MainMedia>
                  {selectedPost.media[currentMediaIndex].type === 'video' ? (
                    <MainVideo controls>
                      <source src={`${API_BASE}${selectedPost.media[currentMediaIndex].url}`} type={selectedPost.media[currentMediaIndex].mimetype} />
                    </MainVideo>
                  ) : (
                    <MainImage 
                      src={`${API_BASE}${selectedPost.media[currentMediaIndex].url}`} 
                      alt={`Media ${currentMediaIndex + 1}`}
                    />
                  )}
                </MainMedia>

                {/* Inner Navigation Arrows (for multiple media in same post) */}
                {selectedPost.media.length > 1 && (
                  <>
                    <InnerLeftArrow 
                      onClick={prevMedia}
                      disabled={currentMediaIndex === 0}
                    >
                      <FaChevronLeft />
                    </InnerLeftArrow>
                    <InnerRightArrow 
                      onClick={nextMedia}
                      disabled={currentMediaIndex === selectedPost.media.length - 1}
                    >
                      <FaChevronRight />
                    </InnerRightArrow>
                  </>
                )}

                {/* Media Indicators */}
                {selectedPost.media.length > 1 && (
                  <MediaIndicator>
                    {selectedPost.media.map((_, index) => (
                      <Dot key={index} active={index === currentMediaIndex} />
                    ))}
                  </MediaIndicator>
                )}
              </MediaContainer>

              {/* Outer Navigation Arrows (for different posts) */}
              {posts.length > 1 && (
                <>
                  <OuterLeftArrow 
                    onClick={prevPost}
                    disabled={currentPostIndex === 0}
                  >
                    <FaChevronLeft />
                  </OuterLeftArrow>
                  <OuterRightArrow 
                    onClick={nextPost}
                    disabled={currentPostIndex === posts.length - 1}
                  >
                    <FaChevronRight />
                  </OuterRightArrow>
                </>
              )}
            </MediaSection>

            {/* Right Side - Details Section */}
            <DetailsSection>
              <DetailsHeader>
                <Username onClick={() => window.open('https://www.instagram.com/nomu.ph/', '_blank')}>
                  <FaInstagram style={{ color: '#E4405F', fontSize: '18px' }} />
                  nomu.ph
                  <VerifiedBadge>✓</VerifiedBadge>
                </Username>
                <CloseButton onClick={closeModal}>
                  <FaTimes />
                </CloseButton>
              </DetailsHeader>

              <DetailsBody>
                <div>
                  <Caption>
                    {selectedPost.description || selectedPost.title}
                  </Caption>

                  {selectedPost.tags && selectedPost.tags.length > 0 && (
                    <Hashtags>
                      {selectedPost.tags.map((tag, index) => (
                        <span key={index}>#{tag} </span>
                      ))}
                    </Hashtags>
                  )}

                  {/* Comments Display */}
                  {comments[selectedPost._id] && comments[selectedPost._id].length > 0 && (
                    <CommentsSection>
                      {comments[selectedPost._id].slice(0, 3).map((comment) => (
                        <CommentItem key={comment.id}>
                          <CommentUser>
                            <CommentAvatar>
                              {comment.user.profilePicture ? (
                                <img src={`${API_BASE}${comment.user.profilePicture}`} alt={comment.user.name} />
                              ) : (
                                <div style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  background: '#b08d57', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  {comment.user.name.charAt(0)}
                                </div>
                              )}
                            </CommentAvatar>
                            <CommentContent>
                              <CommentText>
                                <strong>{comment.user.name}</strong> {comment.content}
                              </CommentText>
                              <CommentTime>{formatTimeAgo(comment.createdAt)}</CommentTime>
                            </CommentContent>
                          </CommentUser>
                        </CommentItem>
                      ))}
                      {comments[selectedPost._id].length > 3 && (
                        <ViewMoreComments>
                          View all {comments[selectedPost._id].length} comments
                        </ViewMoreComments>
                      )}
                    </CommentsSection>
                  )}
                </div>

                <div>
                  <PostActions>
                    <PostActionButton 
                      onClick={() => handleLike(selectedPost._id)}
                      style={{ color: engagementStats[selectedPost._id]?.userLiked ? '#ff3040' : '#333' }}
                    >
                      <FaHeart />
                    </PostActionButton>
                    <PostActionButton onClick={() => document.getElementById('commentInput').focus()}>
                      <FaComment />
                    </PostActionButton>
                  </PostActions>

                  <Engagement>
                    {engagementStats[selectedPost._id]?.likeCount || 0} likes
                  </Engagement>

                  <Timestamp>
                    {formatTimeAgo(selectedPost.createdAt)}
                  </Timestamp>

                  <CommentInput>
                    <CommentField 
                      id="commentInput"
                      placeholder="Add a comment..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleComment(selectedPost._id);
                        }
                      }}
                    />
                  </CommentInput>
                </div>
              </DetailsBody>
            </DetailsSection>
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

      {/* Sign In Modal */}
      {showSignInModal && (
        <div className="signin-modal-overlay">
          <div className="signin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="signin-close-button" 
              onClick={() => setShowSignInModal(false)}
            >
              <FaTimes />
            </button>
            <SignInForm 
              preventRedirect={true}
              onSubmit={async (userData) => {
                console.log('🎉 SignInForm onSubmit called with userData:', userData);
                setShowSignInModal(false);
                
                // Wait for token to be stored in localStorage
                const tokenFound = await waitForToken();
                console.log('🔄 Token found after login:', tokenFound);
                
                if (tokenFound) {
                  console.log('🔄 Updating global auth state...');
                  login(userData);
                  
                  // Trigger auth change event for other components
                  window.dispatchEvent(new CustomEvent('authChanged'));
                  
                  // Wait for state to update, then refresh engagement data
                  setTimeout(() => {
                    console.log('🔄 Refreshing engagement data...');
                    if (selectedPost) {
                      fetchEngagementStats(selectedPost._id);
                    }
                  }, 200);
                } else {
                  console.log('❌ Token not found, authentication failed');
                }
              }}
              onSwitch={() => {
                setShowSignInModal(false);
                setShowSignUpModal(true);
              }}
            />
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <div className="signin-modal-overlay">
          <div className="signin-modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="signin-close-button" 
              onClick={() => setShowSignUpModal(false)}
            >
              <FaTimes />
            </button>
            <SignUpForm 
              onSubmit={async (userData) => {
                console.log('🎉 SignUpForm onSubmit called with userData:', userData);
                setShowSignUpModal(false);
                
                // Wait for token to be stored in localStorage
                const tokenFound = await waitForToken();
                console.log('🔄 Token found after signup:', tokenFound);
                
                if (tokenFound) {
                  console.log('🔄 Updating global auth state...');
                  login(userData);
                  
                  // Trigger auth change event for other components
                  window.dispatchEvent(new CustomEvent('authChanged'));
                  
                  // Wait for state to update, then refresh engagement data
                  setTimeout(() => {
                    console.log('🔄 Refreshing engagement data...');
                    if (selectedPost) {
                      fetchEngagementStats(selectedPost._id);
                    }
                  }, 200);
                } else {
                  console.log('❌ Token not found, authentication failed');
                }
              }}
              onSwitch={() => {
                setShowSignUpModal(false);
                setShowSignInModal(true);
              }}
            />
          </div>
        </div>
      )}
    </GalleryContainer>
  );
};

export default Gallery;