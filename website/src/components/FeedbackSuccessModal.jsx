import React from 'react';
import styled from 'styled-components';

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
  position: relative;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { 
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 8px 20px rgba(40, 167, 69, 0.3);

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

const FeedbackSuccessModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <SuccessIcon>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </SuccessIcon>
        <Title>Feedback Submitted Successfully!</Title>
        <Message>Thank you for your feedback! We appreciate your message and will get back to you soon.</Message>
        <CloseButton onClick={onClose}>
          Close
        </CloseButton>
      </ModalContent>
    </ModalBackdrop>
  );
};

export default FeedbackSuccessModal;
