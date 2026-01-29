import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { lightTheme } from '../utils/Themes';
import { FaFacebookF, FaInstagram, FaTiktok, FaPlay, FaImages, FaTimes, FaHeart, FaComment, FaShare, FaBookmark, FaChevronLeft, FaChevronRight, FaImage } from 'react-icons/fa';
import Logo from '../utils/Images/Logo.png';
import ForGalleryPageImage from '../utils/Images/Gallery/ForGalleryPage.jpg';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2px;
  
  @media (min-width: 1400px) {
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media (min-width: 1024px) and (max-width: 1399px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (min-width: 768px) and (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  border: none;
  border-radius: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #adb5bd;
  text-align: center;
  padding: 20px;
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  
  /* Subtle pattern overlay */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 20px);
    opacity: 0.3;
  }
`;

const EmptyIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.4;
  position: relative;
  z-index: 1;
  
  /* Use a simple icon instead of emoji */
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 48px;
    height: 48px;
    color: #adb5bd;
  }
`;

const EmptyText = styled.p`
  font-size: 0.85rem;
  margin: 0;
  font-weight: 400;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  opacity: 0.6;
  position: relative;
  z-index: 1;
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
  
  @media (max-width: 1366px) {
    padding: 10px;
  }
  
  @media (max-width: 768px) {
    /* Mobile: allow modal content to scroll; don't block touch */
    width: 100vw !important;
    height: 100vh !important;
    overflow: hidden !important;
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
  min-height: 500px;
  overscroll-behavior: contain;
  margin: auto;
  
  @media (max-height: 800px) {
    height: 90vh;
    min-height: 450px;
    max-height: 95vh;
  }
  
  @media (max-width: 1366px) {
    max-width: 95vw;
    height: 90vh;
    min-height: 500px;
    max-height: 95vh;
  }
  
  @media (max-width: 1024px) {
    max-width: 95vw;
    height: 90vh;
    min-height: 450px;
    max-height: 95vh;
  }
  
  @media (max-width: 768px) {
    /* Mobile: fixed 100vh so content overflows and user can scroll to bottom of post */
    max-width: 100vw !important;
    max-height: 100vh !important;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0 !important;
    flex-direction: column !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-y !important;
    overscroll-behavior-y: contain !important;
  }
`;

// Sign In/Sign Up Modal styled-components (matching Navbar/ContactUs)
const AuthModalBackdrop = styled.div`
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
  animation: ${props => props.$isClosing ? 'modalFadeOut 0.3s ease-out' : 'modalFadeIn 0.3s ease-out'} !important;

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

  @keyframes modalFadeOut {
    from {
      opacity: 1;
      backdrop-filter: blur(8px);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
  }
`;

const AuthModalContent = styled.div`
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
  animation: ${props => props.$isClosing ? 'none' : 'modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'};
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
`;

const AuthCloseModalButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(33, 44, 89, 0.1);
  border: 2px solid #212c59;
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
    border-color: #212c59;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }
`;

const MediaSection = styled.div`
  flex: 1;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Mobile only: fixed height so modal content can scroll to bottom */
  @media (max-width: 768px) {
    flex: 0 0 auto;
    min-height: 55vh;
    max-height: 70vh;
  }
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

  /* Mobile only: hide arrows – use swipe instead */
  @media (max-width: 768px) {
    display: none !important;
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
  min-width: 350px;
  display: flex;
  flex-direction: column;
  background: white;
  border-left: 1px solid #e9ecef;
  
  @media (max-width: 1366px) {
    flex: 0 0 350px;
    min-width: 300px;
  }
  
  @media (max-width: 1024px) {
    flex: 0 0 320px;
    min-width: 280px;
  }
  
  @media (max-width: 768px) {
    flex: 0 0 auto; /* Don't grow/shrink – height = content so modal can scroll to bottom */
    flex-basis: auto;
    min-width: 0;
    min-height: 0;
    border-left: none;
    border-top: 1px solid #e9ecef;
    overflow: visible;
  }
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
  border: 2px solid #212c59;
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
    border-color: #212c59;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }
`;

const DetailsBody = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  
  @media (max-width: 1366px) {
    padding: 16px;
  }
  
  @media (max-width: 1024px) {
    padding: 15px;
  }
  
  @media (max-width: 768px) {
    min-height: 0; /* Allow flex item to shrink */
    padding: 15px;
  }
`;

const DetailsBodyTop = styled.div`
  flex: 1;
  min-height: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  position: relative;
  
  @media (max-width: 1366px) {
    overflow: visible;
  }
`;

const DetailsBodyBottom = styled.div`
  flex-shrink: 0;
  margin-top: auto;
`;

const DescriptionSection = styled.div`
  flex-shrink: 0;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 10px;
  
  /* Custom scrollbar for description section */
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
`;

const Caption = styled.div`
  font-size: 14px;
  line-height: 1.4;
  color: #333;
  margin-bottom: 10px;
  max-height: 100px;
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  flex-shrink: 0;
`;

const Hashtags = styled.div`
  font-size: 14px;
  color: #00376b;
  margin-bottom: 10px;
  max-height: 60px;
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
  flex-shrink: 0;
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
  
  &:hover svg {
    color: #0095f6 !important;
  }
  
  /* Heart icon hover - red instead of blue */
  &.heart-button:hover svg {
    color: #ff3040 !important;
  }
  
  &.heart-button:hover {
    color: #ff3040;
  }
`;

const CommentInput = styled.div`
  padding: 15px 0;
  border-top: 1px solid #e9ecef;
  margin-top: 15px;
  
  /* Hide comment input on mobile - it'll be in bottom sheet */
  @media (max-width: 768px) {
    display: none;
  }
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
  margin: 0;
  padding: 0;
  padding-bottom: 120px;
  height: ${props => props.$isExpanded ? '440px' : 'auto'};
  max-height: ${props => props.$isExpanded ? '440px' : '200px'};
  min-height: ${props => props.$isExpanded ? '440px' : '0'};
  margin-bottom: 0;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  position: relative;
  flex-shrink: 0;
  will-change: scroll-position;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none; /* Hide scrollbar in Firefox */
  overscroll-behavior: contain;
  display: block;
  box-sizing: border-box;
  
  /* Ensure scrollbar stays within container bounds - like social media apps */
  &::-webkit-scrollbar {
    position: relative;
    height: 100%;
  }
  
  &::-webkit-scrollbar-track {
    height: 100%;
    max-height: 100%;
    box-sizing: border-box;
  }
  
  /* Desktop - always visible */
  @media (min-width: 769px) {
    display: block !important;
    visibility: visible !important;
  }
  
  /* Responsive height adjustments for smaller desktop screens */
  @media (min-width: 769px) and (max-height: 800px) {
    height: ${props => props.$isExpanded ? '250px' : 'auto'};
    max-height: ${props => props.$isExpanded ? '250px' : '120px'};
    min-height: ${props => props.$isExpanded ? '250px' : '0'};
    padding-bottom: 60px;
  }
  
  @media (min-width: 769px) and (max-width: 1366px) {
    height: ${props => props.$isExpanded ? '320px' : 'auto'};
    max-height: ${props => props.$isExpanded ? '320px' : '150px'};
    min-height: ${props => props.$isExpanded ? '320px' : '0'};
    padding-bottom: ${props => props.$isExpanded ? '200px' : '140px'};
  }
  
  /* Hide comments section on mobile - they'll appear in bottom sheet */
  @media (max-width: 768px) {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
  }
  
  /* Desktop scrolling improvements - Instagram-style */
  @media (min-width: 769px) {
    transition: max-height 0.3s ease, height 0.3s ease, min-height 0.3s ease;
    
    /* Hide scrollbar but keep scrolling functionality */
    &::-webkit-scrollbar {
      width: 0px;
      display: none !important;
    }
    
    &::-webkit-scrollbar-track {
      display: none !important;
    }
    
    &::-webkit-scrollbar-thumb {
      display: none !important;
    }
    
    /* For Firefox */
    scrollbar-width: none;
  }
  
  /* Adjust scrollbar track margin for smaller screens */
  @media (min-width: 769px) and (max-height: 800px) {
    &::-webkit-scrollbar-track {
      margin-bottom: 80px;
    }
  }
  
  @media (min-width: 769px) and (max-width: 1366px) {
    &::-webkit-scrollbar-track {
      margin-bottom: 100px;
    }
  }
`;

const CommentItem = styled.div`
  margin-bottom: 16px;
  padding-right: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const CommentUser = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  width: 100%;
`;

const CommentAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CommentContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CommentText = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: #262626;
  word-wrap: break-word;
  margin-bottom: 4px;
  
  strong {
    font-weight: 600;
    color: #262626;
    margin-right: 4px;
    cursor: pointer;
    
    &:hover {
      color: #8e8e8e;
    }
  }
`;

const CommentTime = styled.div`
  font-size: 12px;
  color: #8e8e8e;
  margin-top: 2px;
  font-weight: 400;
`;

// Mobile Comment Sheet (Instagram-style bottom sheet)
const MobileCommentSheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 20px 20px 0 0;
  max-height: 80vh;
  height: ${props => props.$isOpen ? '80vh' : '0'};
  display: flex;
  flex-direction: column;
  z-index: 1001;
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(100%)'};
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  min-height: 0;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

const MobileCommentSheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
`;

const MobileCommentCloseButton = styled.button`
  background: rgba(33, 44, 89, 0.1);
  border: 2px solid #212c59;
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
  padding: 0;
  
  &:hover {
    background: #212c59;
    border-color: #212c59;
    color: white;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
  }
`;

const MobileCommentSheetContent = styled.div`
  flex: 1;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  padding: 16px 20px;
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
  min-height: 0;
  max-height: 100%;
  scrollbar-width: none; /* Hide scrollbar in Firefox */
  overscroll-behavior: contain;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const MobileCommentSheetInput = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
  display: flex;
  align-items: center;
  gap: 12px;
  
  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    color: #333;
    background: transparent;
    
    &::placeholder {
      color: #999;
    }
  }
  
  button {
    background: none;
    border: none;
    color: #0095f6;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    
    &:disabled {
      color: #c0c0c0;
      cursor: not-allowed;
    }
  }
`;

const MobileCommentBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease, visibility 0.3s ease;
  
  @media (min-width: 769px) {
    display: none;
  }
`;

/* Mobile only: fullscreen image/video overlay when user taps media */
const MobileFullscreenOverlay = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: ${props => props.$open ? 'flex' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #000;
    z-index: 2000;
    align-items: center;
    justify-content: center;
    padding: 50px 0 20px;
    box-sizing: border-box;
  }
`;

const MobileFullscreenMedia = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  img, video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`;

const MobileFullscreenClose = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.8);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  z-index: 2001;
  padding: 0;
`;

const ViewMoreComments = styled.div`
  font-size: 14px;
  color: #8e8e8e;
  cursor: pointer;
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 4px 0;
  font-weight: 400;
  transition: color 0.2s ease;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
  display: block;
  visibility: visible !important;
  
  &:hover {
    color: #262626;
  }
  
  /* Ensure visibility on all screen sizes */
  @media (min-width: 769px) {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
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
  const [showMobileComments, setShowMobileComments] = useState(false);
  const [expandedComments, setExpandedComments] = useState({}); // Track which posts have expanded comments
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Refs for scrollable comment sections
  const commentsSectionRef = useRef(null);
  const mobileCommentsRef = useRef(null);
  
  // Function to apply comments section styles
  const applyCommentsStyles = useCallback((element) => {
    if (!element || !selectedPost) return;
    
    // Responsive height based on screen size
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    let commentsHeight = '440px';
    let commentsMaxHeight = '440px';
    let commentsMinHeight = '440px';
    let paddingBottom = '120px';
    
    if (screenHeight <= 800) {
      commentsHeight = '250px';
      commentsMaxHeight = '250px';
      commentsMinHeight = '250px';
      paddingBottom = '60px';
    } else if (screenWidth <= 1366) {
      commentsHeight = '320px';
      commentsMaxHeight = '320px';
      commentsMinHeight = '320px';
      // More padding when expanded to show last comment timestamp fully
      paddingBottom = expandedComments[selectedPost?._id] ? '200px' : '140px';
    }
    
    // Always ensure overflow is set, regardless of expanded state
    element.style.setProperty('overflow-y', 'auto', 'important');
    element.style.setProperty('overflow-x', 'hidden', 'important');
    element.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
    element.style.height = expandedComments[selectedPost?._id] ? commentsHeight : 'auto';
      element.style.maxHeight = expandedComments[selectedPost?._id] ? commentsMaxHeight : (screenHeight <= 800 ? '120px' : (screenWidth <= 1366 ? '150px' : '200px'));
    element.style.minHeight = expandedComments[selectedPost?._id] ? commentsMinHeight : '0';
    // Force the element to be scrollable and not constrained by flex
    element.style.position = 'relative';
    element.style.display = 'block';
    element.style.flexShrink = '0';
    element.style.flexGrow = '0';
    // Ensure it can receive scroll events
    element.style.pointerEvents = 'auto';
      // Ensure padding is applied for last comment visibility (responsive)
      element.style.paddingBottom = paddingBottom;
      element.style.paddingTop = '5px';
      element.style.boxSizing = 'border-box';
      
      // Scrollbar is now hidden but scrolling functionality remains
      // No need for scrollbar height calculations
    // Force a reflow to ensure styles are applied
    void element.offsetHeight;
  }, [selectedPost, expandedComments]);
  
  // Callback ref to apply styles immediately when element mounts
  const commentsSectionCallbackRef = useCallback((node) => {
    commentsSectionRef.current = node;
    if (node && showModal && selectedPost) {
      // Apply styles immediately when element is mounted
      applyCommentsStyles(node);
      // Also apply after a short delay to ensure everything is ready
      setTimeout(() => applyCommentsStyles(node), 0);
    }
  }, [showModal, selectedPost, applyCommentsStyles]);

  // Track window size to determine if mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Engagement state
  const [engagementStats, setEngagementStats] = useState({});
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [userLiked, setUserLiked] = useState({});
  const [newComment, setNewComment] = useState('');
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [isOTPFormShowing, setIsOTPFormShowing] = useState(false);
  const [showMobileImageFullscreen, setShowMobileImageFullscreen] = useState(false);

  /* Mobile only: swipe vs tap – refs to avoid opening fullscreen when user swiped */
  const touchStartXRef = useRef(0);
  const swipeHandledRef = useRef(false);

  // Use global auth context
  const { isAuthenticated, user, checkAuthentication, login } = useAuth();
  
  // Navigation hook for mobile sign-in page
  const navigate = useNavigate();

  // API_BASE is already defined at the top of the file

  // Add global styles for fullscreen videos
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide fullscreen, download, and picture-in-picture controls */
      video::-webkit-media-controls-fullscreen-button {
        display: none !important;
      }
      
      video::-webkit-media-controls-picture-in-picture-button {
        display: none !important;
      }
      
      video::-webkit-media-controls-download-button {
        display: none !important;
      }
      
      /* For Firefox */
      video::-moz-media-controls-fullscreen-button {
        display: none !important;
      }
      
      /* Reverse volume slider - fill appears on right side of handle */
      video::-webkit-media-controls-volume-slider-container {
        direction: ltr;
      }
      
      video::-webkit-media-controls-volume-slider {
        direction: ltr;
        transform: scaleX(-1);
      }
      
      /* Flip the mute button back to normal */
      video::-webkit-media-controls-mute-button {
        transform: scaleX(-1);
      }
      
      /* Reverse the slider track fill direction */
      video::-webkit-media-controls-volume-slider::-webkit-slider-runnable-track {
        direction: rtl;
      }
      
      /* Disable right-click context menu options */
      video {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchGalleryPosts();
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedPost) {
      fetchEngagementStats(selectedPost._id);
      fetchComments(selectedPost._id);
      fetchLikes(selectedPost._id);
    }
  }, [selectedPost, isAuthenticated]);

  // Clear likes when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setUserLiked({});
      // Reset engagement stats userLiked flags
      setEngagementStats(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(postId => {
          if (updated[postId]) {
            updated[postId] = { ...updated[postId], userLiked: false };
          }
        });
        return updated;
      });
    }
  }, [isAuthenticated]);

  // Use useLayoutEffect for synchronous DOM updates before paint
  useLayoutEffect(() => {
    if (!showModal || !selectedPost) return;
    
    const commentsEl = commentsSectionRef.current;
    if (commentsEl) {
      applyCommentsStyles(commentsEl);
    }
  }, [showModal, selectedPost, expandedComments, applyCommentsStyles]);
  
  // Also use useEffect as backup for any missed updates
  useEffect(() => {
    if (!showModal || !selectedPost) return;
    
    const commentsEl = commentsSectionRef.current;
    const mobileEl = mobileCommentsRef.current;

    if (commentsEl) {
      applyCommentsStyles(commentsEl);
    }
    
    if (mobileEl && showMobileComments) {
      // Ensure mobile comment sheet content is scrollable
      mobileEl.style.setProperty('overflow-y', 'auto', 'important');
      mobileEl.style.setProperty('overflow-x', 'hidden', 'important');
      mobileEl.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
      mobileEl.style.position = 'relative';
      mobileEl.style.pointerEvents = 'auto';
      mobileEl.style.paddingBottom = '20px';
    }
    
    // Also run after a short delay as backup
    const timeout = setTimeout(() => {
      if (commentsEl) {
        applyCommentsStyles(commentsEl);
      }
    }, 10);
    
    return () => clearTimeout(timeout);
  }, [showModal, expandedComments, showMobileComments, selectedPost, applyCommentsStyles]);

  // Reset video when media index changes to ensure new video loads
  useEffect(() => {
    if (showModal && selectedPost && selectedPost.media[currentMediaIndex]?.type === 'video') {
      const video = document.querySelector('video');
      if (video) {
        video.load(); // Force video to reload with new source
      }
    }
  }, [currentMediaIndex, showModal, selectedPost]);


  // Handle video fullscreen and picture-in-picture to maintain aspect ratio
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Use Fullscreen API to get the fullscreen element (not CSS selectors)
      const fullscreenElement = document.fullscreenElement || 
                                document.webkitFullscreenElement ||
                                document.mozFullScreenElement ||
                                document.msFullscreenElement;
      
      if (fullscreenElement) {
        let video = null;
        let container = null;
        
        // Check if the fullscreen element is the video itself
        if (fullscreenElement.tagName === 'VIDEO') {
          video = fullscreenElement;
          container = fullscreenElement;
        } else {
          // If it's a container, find the video inside
          video = fullscreenElement.querySelector('video');
          container = fullscreenElement;
        }
        
        if (video) {
          const isPortrait = video.videoHeight > video.videoWidth;
          
          // Small delay to ensure fullscreen is fully applied
          setTimeout(() => {
            // Style the fullscreen container
            if (container) {
              container.style.display = 'flex';
              container.style.alignItems = 'center';
              container.style.justifyContent = 'center';
              container.style.width = '100vw';
              container.style.height = '100vh';
              container.style.backgroundColor = '#000';
              container.style.margin = '0';
              container.style.padding = '0';
            }
            
            // Apply styles to maintain aspect ratio
            if (isPortrait) {
              video.style.objectFit = 'contain';
              video.style.width = 'auto';
              video.style.height = '100vh';
              video.style.maxWidth = '100vw';
              video.style.margin = '0';
              video.style.display = 'block';
            } else {
              video.style.objectFit = 'contain';
              video.style.width = '100vw';
              video.style.height = 'auto';
              video.style.maxHeight = '100vh';
              video.style.margin = '0';
              video.style.display = 'block';
            }
          }, 50);
        }
      } else {
        // Exiting fullscreen - reset styles if needed
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.classList.contains('video-portrait') || video.classList.contains('video-landscape')) {
            // Reset to default styles when exiting fullscreen
            video.style.width = '';
            video.style.height = '';
            video.style.maxWidth = '';
            video.style.maxHeight = '';
            video.style.margin = '';
          }
        });
      }
    };

    const handleEnterPictureInPicture = (e) => {
      const video = e.target;
      const isPortrait = video.videoHeight > video.videoWidth;
      
      // Picture-in-picture maintains the video's natural aspect ratio
      // but we ensure it displays correctly
      if (isPortrait) {
        video.style.objectFit = 'contain';
      } else {
        video.style.objectFit = 'contain';
      }
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Picture-in-picture events
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
    });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      videos.forEach(video => {
        video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
      });
    };
  }, [showModal, currentMediaIndex]);

  // Handle body class for modal consistency and scroll prevention
  const galleryModalScrollYRef = useRef(0);
  const preventScrollRef = useRef(null);
  
  useEffect(() => {
    // Always prevent background scroll when modals are open OR closing (both desktop and mobile)
    // This prevents flickering during the closing animation
    if (showModal || showSignInModal || isModalClosing) {
      // Store scroll position before locking
      galleryModalScrollYRef.current = window.scrollY;
      
      // Prevent scrolling using overflow and event listeners (no position: fixed to avoid flicker)
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'relative';
      document.documentElement.style.overflow = 'hidden';
      
      // Add event listeners to prevent scroll on background only
      const preventScroll = (e) => {
        // Allow scrolling inside modal content (gallery post modal + sign-in/sign-up modals)
        const target = e.target;
        const isInsideModal = target.closest('.signin-modal-content') || 
                              target.closest('[class*="ModalContent"]') ||
                              target.closest('[class*="AuthModalContent"]') ||
                              target.closest('[data-gallery-modal]'); // gallery post modal – allow touch scroll on mobile
        
        if (!isInsideModal) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      preventScrollRef.current = preventScroll;
      
      const keydownHandler = (e) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
          preventScroll(e);
        }
      };
      
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('keydown', keydownHandler, { passive: false });
      
      // Store keydown handler for cleanup
      preventScrollRef.current.keydownHandler = keydownHandler;
      
      // If closing, restore after animation completes
      if (isModalClosing && !showModal && !showSignInModal) {
        const timer = setTimeout(() => {
          // Remove event listeners
          if (preventScrollRef.current) {
            document.removeEventListener('wheel', preventScrollRef.current);
            document.removeEventListener('touchmove', preventScrollRef.current);
            if (preventScrollRef.current.keydownHandler) {
              document.removeEventListener('keydown', preventScrollRef.current.keydownHandler);
            }
            preventScrollRef.current = null;
          }
          
          // Restore styles after animation completes
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.width = '';
          document.body.style.height = '';
          document.documentElement.style.overflow = '';
        }, 400); // Match animation duration
        return () => clearTimeout(timer);
      }
    } else {
      // Remove immediately if modal is fully closed
      if (preventScrollRef.current) {
        document.removeEventListener('wheel', preventScrollRef.current);
        document.removeEventListener('touchmove', preventScrollRef.current);
        if (preventScrollRef.current.keydownHandler) {
          document.removeEventListener('keydown', preventScrollRef.current.keydownHandler);
        }
        preventScrollRef.current = null;
      }
      
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      // Cleanup on unmount - restore immediately
      if (preventScrollRef.current) {
        document.removeEventListener('wheel', preventScrollRef.current);
        document.removeEventListener('touchmove', preventScrollRef.current);
        if (preventScrollRef.current.keydownHandler) {
          document.removeEventListener('keydown', preventScrollRef.current.keydownHandler);
        }
        preventScrollRef.current = null;
      }
      
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    };
  }, [showModal, showSignInModal, isModalClosing]);

  const fetchGalleryPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/gallery/client`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch gallery posts');
      }

      const data = await response.json();
      setPosts(data.data || []);
      
      // Fetch likes for all posts if user is authenticated
      if (isAuthenticated && data.data && data.data.length > 0) {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
          // Fetch likes for all posts in parallel
          const likePromises = data.data.map(post => 
            fetch(`${API_BASE}/api/engagement/likes/${post._id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }).then(res => res.ok ? res.json() : null).catch(() => null)
          );
          
          const likeResults = await Promise.all(likePromises);
          
          // Update userLiked state for all posts
          const userLikedMap = {};
          const engagementStatsMap = {};
          
          likeResults.forEach((result, index) => {
            if (result && data.data[index]) {
              const postId = data.data[index]._id;
              userLikedMap[postId] = result.userLiked || false;
              engagementStatsMap[postId] = {
                likeCount: result.totalLikes || 0,
                userLiked: result.userLiked || false
              };
            }
          });
          
          setUserLiked(prev => ({ ...prev, ...userLikedMap }));
          setEngagementStats(prev => ({ ...prev, ...engagementStatsMap }));
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to wait for token to be stored (checks both localStorage and sessionStorage)
  const waitForToken = async (maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
        const list = Array.isArray(data?.comments) ? data.comments : [];
        setComments(prev => ({
          ...prev,
          [postId]: list
        }));
      } else {
        setComments(prev => ({ ...prev, [postId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments(prev => ({ ...prev, [postId]: [] }));
    }
  };

  const fetchLikes = async (postId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/likes/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLikes(prev => ({
          ...prev,
          [postId]: data.likes
        }));
        
        // Update userLiked state
        setUserLiked(prev => ({
          ...prev,
          [postId]: data.userLiked || false
        }));
        
        // Update engagement stats with like count and user liked status
        setEngagementStats(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            likeCount: data.totalLikes,
            userLiked: data.userLiked || false
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleLike = async (postId) => {
    if (!isAuthenticated) {
      if (isMobile) {
        navigate('/signin');
      } else {
        setShowSignInModal(true);
      }
      return;
    }
    

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/like/${postId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
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
      if (isMobile) {
        navigate('/signin');
      } else {
        setShowSignInModal(true);
      }
      return;
    }
    

    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
        const added = data?.comment;
        if (added) {
          setComments(prev => ({
            ...prev,
            [postId]: [{ ...added, id: String(added.id) }, ...(prev[postId] || [])]
          }));
        }
        setEngagementStats(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            commentCount: (prev[postId]?.commentCount || 0) + 1
          }
        }));
        setNewComment('');
        // Refetch comments from server so list persists after refresh
        fetchComments(postId);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    if (!isAuthenticated) {
      if (isMobile) {
        navigate('/signin');
      } else {
        setShowSignInModal(true);
      }
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setComments(prev => ({
          ...prev,
          [postId]: (prev[postId] || []).filter(comment => String(comment.id) !== String(commentId))
        }));
        setEngagementStats(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            commentCount: Math.max((prev[postId]?.commentCount || 1) - 1, 0)
          }
        }));
      } else {
        console.error('Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
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
    // Reset expanded comments for this post to ensure proper initial state
    setExpandedComments(prev => ({
      ...prev,
      [post._id]: false
    }));
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPost(null);
    setCurrentMediaIndex(0);
    setCurrentPostIndex(0);
    setShowMobileComments(false);
    setShowMobileImageFullscreen(false);
    setExpandedComments({}); // Reset expanded comments when modal closes
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
            <MainVideo 
              controls
              onLoadedMetadata={(e) => {
                const video = e.target;
                const isPortrait = video.videoHeight > video.videoWidth;
                video.classList.toggle('video-portrait', isPortrait);
                video.classList.toggle('video-landscape', !isPortrait);
              }}
            >
              <source src={`${API_BASE}${media.url}`} type={media.mimetype} />
            </MainVideo>
          ) : (
            <SlotVideo 
              controls
              controlsList="nodownload nofullscreen noremoteplayback"
              disablePictureInPicture
              onContextMenu={(e) => {
                e.preventDefault();
                return false;
              }}
            >
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
        // Empty slot - professional minimal design
        slots.push(
          <EmptySlot key={`empty-${i}`}>
            <EmptyIcon>
              <FaImage />
            </EmptyIcon>
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
          <ModalContent data-gallery-modal onClick={(e) => e.stopPropagation()}>
            {/* Left Side - Media Section */}
            <MediaSection>
              <MediaContainer
                {...(isMobile && {
                  onTouchStart: (e) => {
                    touchStartXRef.current = e.touches[0].clientX;
                    swipeHandledRef.current = false;
                  },
                  onTouchEnd: (e) => {
                    if (selectedPost.media.length > 1) {
                      const delta = touchStartXRef.current - e.changedTouches[0].clientX;
                      if (Math.abs(delta) > 50) {
                        if (delta > 0) nextMedia();
                        else prevMedia();
                        swipeHandledRef.current = true;
                      }
                    }
                  },
                  onClick: (e) => {
                    if (!isMobile) return;
                    if (swipeHandledRef.current) return;
                    if (e.target.closest('button')) return;
                    if (e.target.closest('[data-media-tap]')) setShowMobileImageFullscreen(true);
                  }
                })}
              >
                <MainMedia data-media-tap={isMobile ? '' : undefined} style={isMobile ? { cursor: 'pointer' } : undefined}>
                  {selectedPost.media[currentMediaIndex].type === 'video' ? (
                    <MainVideo 
                      key={`video-${selectedPost._id}-${currentMediaIndex}`}
                      controls
                      controlsList="nodownload nofullscreen noremoteplayback"
                      disablePictureInPicture
                      onLoadedMetadata={(e) => {
                        const video = e.target;
                        const isPortrait = video.videoHeight > video.videoWidth;
                        video.classList.toggle('video-portrait', isPortrait);
                        video.classList.toggle('video-landscape', !isPortrait);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        return false;
                      }}
                    >
                      <source src={`${API_BASE}${selectedPost.media[currentMediaIndex].url}`} type={selectedPost.media[currentMediaIndex].mimetype} />
                    </MainVideo>
                  ) : (
                    <MainImage 
                      key={`image-${selectedPost._id}-${currentMediaIndex}`}
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
                </Username>
                <CloseButton onClick={closeModal}>
                  <FaTimes />
                </CloseButton>
              </DetailsHeader>

              <DetailsBody>
                <DetailsBodyTop>
                  <DescriptionSection>
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
                  </DescriptionSection>

                  {/* Comments Display - Only show on desktop, completely hidden on mobile */}
                  {comments[selectedPost._id] && comments[selectedPost._id].length > 0 && (
                    <>
                      <CommentsSection 
                        ref={commentsSectionCallbackRef}
                        id={`comments-section-${selectedPost._id}`}
                        $isExpanded={expandedComments[selectedPost._id]}
                        tabIndex={0}
                        style={{
                          cursor: 'default',
                          overflowY: 'auto',
                          overflowX: 'hidden',
                          WebkitOverflowScrolling: 'touch',
                          paddingBottom: expandedComments[selectedPost._id] ? '200px' : '50px',
                          paddingTop: '0',
                          boxSizing: 'border-box'
                        }}
                      >
                        {(expandedComments[selectedPost._id] 
                          ? comments[selectedPost._id] 
                          : comments[selectedPost._id].slice(0, 3)
                        ).map((comment) => (
                          <CommentItem key={String(comment.id)}>
                            <CommentUser>
                              <CommentAvatar>
                                {comment.user?.profilePicture ? (
                                  <img src={`${API_BASE}${comment.user.profilePicture}`} alt={comment.user?.name} />
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
                                    {(comment.user?.name || '?').charAt(0)}
                                  </div>
                                )}
                              </CommentAvatar>
                              <CommentContent>
                                <CommentText>
                                  <strong>{comment.user?.name ?? 'User'}</strong> {comment.content}
                                </CommentText>
                                <CommentTime>{formatTimeAgo(comment.createdAt)}</CommentTime>
                              </CommentContent>
                              {isAuthenticated && user && String(user.id) === String(comment.user?.id) && (
                                <button
                                  onClick={() => handleDeleteComment(String(comment.id), selectedPost._id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#8e8e8e',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    padding: '0',
                                    marginLeft: 'auto',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s ease, color 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.opacity = '1';
                                    e.target.style.color = '#262626';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.opacity = '0.7';
                                    e.target.style.color = '#8e8e8e';
                                  }}
                                  title="Delete comment"
                                >
                                  ✕
                                </button>
                              )}
                            </CommentUser>
                          </CommentItem>
                        ))}
                      </CommentsSection>
                      {/* View all comments link - outside scrollable area to ensure visibility */}
                      {comments[selectedPost._id].length > 3 && !expandedComments[selectedPost._id] && (
                        <ViewMoreComments
                          onClick={() => {
                            setExpandedComments(prev => ({
                              ...prev,
                              [selectedPost._id]: true
                            }));
                          }}
                          style={{
                            display: 'block',
                            visibility: 'visible',
                            opacity: 1,
                            marginTop: '4px',
                            marginBottom: '4px'
                          }}
                        >
                          View all {comments[selectedPost._id].length} comments
                        </ViewMoreComments>
                      )}
                    </>
                  )}
                </DetailsBodyTop>

                <DetailsBodyBottom>
                  <PostActions>
                    <PostActionButton 
                      className="heart-button"
                      onClick={() => handleLike(selectedPost._id)}
                    >
                      <FaHeart style={{ color: engagementStats[selectedPost._id]?.userLiked ? '#ff3040' : '#333' }} />
                    </PostActionButton>
                    <PostActionButton 
                      onClick={() => {
                        // On mobile, show comment sheet; on desktop, focus input
                        if (window.innerWidth <= 768) {
                          setShowMobileComments(true);
                        } else {
                          document.getElementById('commentInput')?.focus();
                        }
                      }}
                    >
                      <FaComment />
                    </PostActionButton>
                  </PostActions>

                  <Engagement>
                    {engagementStats[selectedPost._id]?.likeCount || 0} likes
                  </Engagement>

                  <Timestamp>
                    {new Date(selectedPost.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    }).toUpperCase()}
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
                </DetailsBodyBottom>
              </DetailsBody>
            </DetailsSection>
          </ModalContent>

          {/* Mobile only: fullscreen image/video when user taps media */}
          {isMobile && showMobileImageFullscreen && (
            <MobileFullscreenOverlay
              $open={true}
              onClick={() => setShowMobileImageFullscreen(false)}
              role="button"
              tabIndex={0}
              aria-label="Close fullscreen"
            >
              <MobileFullscreenClose
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMobileImageFullscreen(false);
                }}
                aria-label="Close"
              >
                <FaTimes />
              </MobileFullscreenClose>
              <MobileFullscreenMedia onClick={(e) => e.stopPropagation()}>
                {selectedPost.media[currentMediaIndex].type === 'video' ? (
                  <MainVideo
                    key={`fs-video-${selectedPost._id}-${currentMediaIndex}`}
                    controls
                    controlsList="nodownload nofullscreen noremoteplayback"
                    disablePictureInPicture
                    onClick={(e) => e.stopPropagation()}
                  >
                    <source src={`${API_BASE}${selectedPost.media[currentMediaIndex].url}`} type={selectedPost.media[currentMediaIndex].mimetype} />
                  </MainVideo>
                ) : (
                  <MainImage
                    key={`fs-image-${selectedPost._id}-${currentMediaIndex}`}
                    src={`${API_BASE}${selectedPost.media[currentMediaIndex].url}`}
                    alt={`Media ${currentMediaIndex + 1}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </MobileFullscreenMedia>
            </MobileFullscreenOverlay>
          )}
        </ModalOverlay>
      )}

      {/* Mobile Comment Sheet (Instagram-style) */}
      {showModal && selectedPost && (
        <>
          <MobileCommentBackdrop 
            $isOpen={showMobileComments}
            onClick={() => setShowMobileComments(false)}
          />
          <MobileCommentSheet $isOpen={showMobileComments}>
            <MobileCommentSheetHeader>
              <h3>Comments</h3>
              <MobileCommentCloseButton onClick={() => setShowMobileComments(false)}>
                <FaTimes />
              </MobileCommentCloseButton>
            </MobileCommentSheetHeader>
            <MobileCommentSheetContent
              ref={mobileCommentsRef}
              tabIndex={0}
              style={{
                cursor: 'default'
              }}
            >
              {comments[selectedPost._id] && comments[selectedPost._id].length > 0 ? (
                comments[selectedPost._id].map((comment) => (
                  <CommentItem key={String(comment.id)} style={{ marginBottom: '16px' }}>
                    <CommentUser>
                      <CommentAvatar>
                        {comment.user?.profilePicture ? (
                          <img src={`${API_BASE}${comment.user.profilePicture}`} alt={comment.user?.name} />
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
                            {(comment.user?.name || '?').charAt(0)}
                          </div>
                        )}
                      </CommentAvatar>
                      <CommentContent>
                        <CommentText>
                          <strong>{comment.user?.name ?? 'User'}</strong> {comment.content}
                        </CommentText>
                        <CommentTime>{formatTimeAgo(comment.createdAt)}</CommentTime>
                      </CommentContent>
                      {isAuthenticated && user && String(user.id) === String(comment.user?.id) && (
                        <button
                          onClick={() => {
                            handleDeleteComment(String(comment.id), selectedPost._id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#8e8e8e',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '0',
                            marginLeft: 'auto',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.7,
                            transition: 'opacity 0.2s ease, color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.opacity = '1';
                            e.target.style.color = '#262626';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.opacity = '0.7';
                            e.target.style.color = '#8e8e8e';
                          }}
                          title="Delete comment"
                        >
                          ✕
                        </button>
                      )}
                    </CommentUser>
                  </CommentItem>
                ))
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  color: '#8e8e8e',
                  fontSize: '14px',
                  fontWeight: '400'
                }}>
                  No comments yet. Be the first to comment!
                </div>
              )}
            </MobileCommentSheetContent>
            <MobileCommentSheetInput>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newComment.trim()) {
                    handleComment(selectedPost._id);
                  }
                }}
              />
              <button
                onClick={() => handleComment(selectedPost._id)}
                disabled={!newComment.trim()}
              >
                Post
              </button>
            </MobileCommentSheetInput>
          </MobileCommentSheet>
        </>
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

      {/* Sign In / Sign Up Modal - Desktop Only */}
      {showSignInModal && !isMobile && (
        <AuthModalBackdrop $isClosing={isModalClosing}>
          <AuthModalContent $isClosing={isModalClosing} onClick={(e) => e.stopPropagation()}>
            {authMode === 'signin' ? (
              <SignInForm 
                preventRedirect={true}
                onSubmit={async (userData) => {
                  console.log('🎉 SignInForm onSubmit called with userData:', userData);
                  setIsModalClosing(true);
                  setTimeout(() => {
                    setShowSignInModal(false);
                    setIsModalClosing(false);
                    setAuthMode('signin');
                  }, 300);
                  
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
                  if (isMobile) {
                    setIsModalClosing(true);
                    setTimeout(() => {
                      setShowSignInModal(false);
                      setIsModalClosing(false);
                      navigate('/signup');
                    }, 300);
                  } else {
                    // Just switch mode without closing modal (no transition)
                    setAuthMode('signup');
                  }
                }}
                onOTPStateChange={setIsOTPFormShowing}
              />
            ) : (
              <SignUpForm 
                onSubmit={async (userData) => {
                  console.log('🎉 SignUpForm onSubmit called with userData:', userData);
                  setIsModalClosing(true);
                  setTimeout(() => {
                    setShowSignInModal(false);
                    setIsModalClosing(false);
                    setAuthMode('signin');
                  }, 300);
                  
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
                  if (isMobile) {
                    setIsModalClosing(true);
                    setTimeout(() => {
                      setShowSignInModal(false);
                      setIsModalClosing(false);
                      navigate('/signin');
                    }, 300);
                  } else {
                    // Just switch mode without closing modal (no transition)
                    setAuthMode('signin');
                  }
                }}
                onOTPStateChange={setIsOTPFormShowing}
              />
            )}
            {!isOTPFormShowing && (
              <AuthCloseModalButton 
                onClick={() => {
                  setIsModalClosing(true);
                  setTimeout(() => {
                    setShowSignInModal(false);
                    setIsModalClosing(false);
                    setAuthMode('signin');
                  }, 300);
                }}
              >
                <FaTimes />
              </AuthCloseModalButton>
            )}
          </AuthModalContent>
        </AuthModalBackdrop>
      )}
    </GalleryContainer>
  );
};

export default Gallery;