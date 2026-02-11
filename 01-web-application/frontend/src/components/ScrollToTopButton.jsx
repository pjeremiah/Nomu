import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaRocket } from 'react-icons/fa';
import { Flame } from 'lucide-react';

const ScrollThreshold = 400;

const Button = styled.button`
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 999;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid #b08d57;
  background: white;
  color: #b08d57;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(176, 141, 87, 0.2);
  transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
  opacity: ${props => props.$visible ? 1 : 0};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  transform: translateY(${props => props.$visible ? 0 : 12}px);

  &:hover {
    background: #b08d57;
    color: white;
    border-color: #9a7a4a;
    transform: translateY(-3px);
    box-shadow: 0 6px 24px rgba(176, 141, 87, 0.4);
  }

  &:active {
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
  }
`;

const RocketWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  line-height: 0;
`;

const RocketIcon = styled(FaRocket)`
  font-size: 20px;
  margin-bottom: -2px;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const FlameIcon = styled(Flame)`
  width: 14px;
  height: 14px;
  color: #b08d57;
  ${Button}:hover & {
    color: white;
  }

  @media (max-width: 768px) {
    width: 12px;
    height: 12px;
  }
`;

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > ScrollThreshold);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      type="button"
      $visible={visible}
      onClick={scrollToTop}
      aria-label="Scroll back to top"
    >
      <RocketWrapper>
        <RocketIcon />
        <FlameIcon />
      </RocketWrapper>
    </Button>
  );
};

export default ScrollToTopButton;
