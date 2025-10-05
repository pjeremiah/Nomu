import React from 'react';
import styled from 'styled-components';
import { FaMobileAlt, FaTimes, FaUserTie } from 'react-icons/fa';

// Use the same styled components as the sign-in modal for consistency
const ModalBackdrop = styled.div`
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100vh !important;
  width: 100vw !important;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  z-index: 2000 !important;
  animation: fadeIn 0.3s ease-out;
  margin: 0 !important;
  padding: 0 !important;

  @keyframes fadeIn {
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
  max-width: 420px;
  width: 90%;
  position: relative;
  box-shadow: 
    0 20px 60px rgba(33, 44, 89, 0.3),
    0 8px 25px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: center;
  text-align: center;
  margin: 0 auto;

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
`;

const MobileIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 8px 20px rgba(74, 144, 226, 0.3);

  svg {
    width: 40px;
    height: 40px;
    color: white;
  }
`;

const Title = styled.h2`
  color: #212c59;
  font-family: 'Montserrat', sans-serif;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 12px 0;
  line-height: 1.3;
`;

const Message = styled.p`
  color: #5a6c7d;
  font-family: 'Montserrat', sans-serif;
  font-size: 16px;
  margin: 0 0 32px 0;
  line-height: 1.5;
`;

const CloseButton = styled.button`
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

const ContinueButton = styled.button`
  background: #212c59;
  color: white;
  border: 2px solid #b08d57;
  border-radius: 12px;
  padding: 16px 32px;
  font-size: 16px;
  font-weight: 600;
  font-family: 'Montserrat', sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  box-shadow: 0 4px 15px rgba(33, 44, 89, 0.3);

  &:hover {
    background: #b08d57;
    border-color: #b08d57;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(176, 141, 87, 0.4);
  }

  &:active {
    background: #9a7a4a;
    border-color: #9a7a4a;
    transform: translateY(0);
    box-shadow: 0 2px 10px rgba(176, 141, 87, 0.3);
  }
`;

const DownloadButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
  width: 100%;
`;

const DownloadButton = styled.a`
  background: linear-gradient(135deg, #b08d57, #c49d67);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;

  &:hover {
    background: linear-gradient(135deg, #9a7a4a, #b08d57);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3);
    color: white;
    text-decoration: none;
  }
`;

const MobileAppModal = ({ isOpen, onContinue }) => {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onContinue();
    }
  };

  // Add event listener for escape key and ensure proper positioning
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Force reflow to ensure proper positioning
      setTimeout(() => {
        const modal = document.querySelector('[data-mobile-modal]');
        if (modal) {
          modal.style.position = 'fixed';
          modal.style.top = '0';
          modal.style.left = '0';
          modal.style.right = '0';
          modal.style.bottom = '0';
          modal.style.display = 'flex';
          modal.style.justifyContent = 'center';
          modal.style.alignItems = 'center';
        }
      }, 0);
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onContinue]);

  // Early return if modal is not open
  if (!isOpen) {
    return null;
  }

  return (
    <ModalBackdrop onClick={handleBackdropClick} data-mobile-modal>
      <ModalContent onClick={e => e.stopPropagation()}>
        <CloseButton onClick={onContinue}>
          <FaTimes />
        </CloseButton>
        <MobileIcon>
          <FaMobileAlt />
        </MobileIcon>
        <Title>Download Mobile Apps</Title>
        <Message>Get the Nomu Cafe mobile apps for the best experience!</Message>
        <DownloadButtons>
          <DownloadButton 
            href="/download-apk.html" 
            target="_blank"
            title="Download Mobile Apps"
          >
            <FaMobileAlt style={{ marginRight: '8px' }} />
            Download Mobile Apps
          </DownloadButton>
        </DownloadButtons>
        <ContinueButton onClick={onContinue}>
          Continue
        </ContinueButton>
      </ModalContent>
    </ModalBackdrop>
  );
};

export default MobileAppModal;
