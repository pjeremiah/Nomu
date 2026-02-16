import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown, Check } from 'lucide-react';

const DropdownContainer = styled.div`
  position: relative;
  display: block;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  padding: 0 !important;
  vertical-align: top;
  align-self: stretch;
  flex: 1;
  min-width: 0;
  margin-top: 0;
  margin-bottom: 0;
  flex-shrink: 0;

  /* Mobile: ensure full-width */
  @media (max-width: 768px) {
    width: 100%;
    margin: 0;
    padding: 0;
    vertical-align: middle;
  }

  @media (max-width: 480px) {
    width: 100%;
    margin: 0;
    padding: 0;
    vertical-align: middle;
  }
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100% !important;
  min-width: 100% !important;
  max-width: 100% !important;
  padding: 12px 16px;
  border-radius: 12px;
  border: 2px solid #e9ecef;
  font-family: 'Montserrat', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  color: ${props => props.$hasValue ? '#212c59' : '#a0a0a0'};
  cursor: pointer;
  text-align: left;
  direction: ltr;
  transition: all 0.3s ease;
  box-sizing: border-box !important;
  background: #ffffff;
  position: relative;
  overflow: hidden;
  margin: 0 !important;
  outline: none;
  align-self: stretch;
  margin-top: 0;
  margin-bottom: 0;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    padding: 14px 16px;
    font-size: 0.95rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
  }

  @media (max-width: 480px) {
    width: 100%;
    padding: 12px 14px;
    font-size: 0.9rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(33, 44, 89, 0.02), rgba(33, 44, 89, 0.01));
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    border-color: #212c59;

    &::before {
      opacity: 1;
    }
  }

  &:focus {
    outline: none;
    border-color: #212c59;
    box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1);
  }

  &:active {
    transform: translateY(-1px);
  }

  &.open {
    border-color: #212c59;
    box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1);
  }
`;

const DropdownText = styled.span`
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ChevronIcon = styled(ChevronDown)`
  width: 14px;
  height: 14px;
  color: #6b7280;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  margin-left: 0.5rem;
  flex-shrink: 0;

  ${DropdownButton}:hover & {
    color: #212c59;
  }

  ${DropdownButton}.open & {
    transform: rotate(180deg);
    color: #212c59;
  }
`;

const DropdownMenu = styled.div`
  position: fixed;
  top: ${props => props.$buttonRect ? `${props.$buttonRect.bottom + 4}px` : '0'};
  left: ${props => props.$buttonRect ? `${props.$buttonRect.left}px` : '0'};
  width: ${props => props.$buttonRect ? `${props.$buttonRect.width}px` : '200px'};
  min-width: ${props => props.$buttonRect ? `${props.$buttonRect.width}px` : '200px'};
  max-width: ${props => props.$buttonRect ? `${props.$buttonRect.width}px` : '200px'};
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 999999;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => {
    if (!props.$isOpen) {
      return 'translateY(-10px) scale(0.95)';
    }
    return 'translateY(0) scale(1)';
  }};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  transform-origin: top center;
`;

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: white;
  border: none;
  font-family: 'Montserrat', sans-serif;
  font-size: 13px;
  line-height: 1.15;
  color: #495057;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  text-align: left;
  position: relative;
  min-width: 0; /* allow shrink for ellipsis */

  /* Force single-line labels with ellipsis when space is tight */
  & > span {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Desktop: slightly smaller so long text fits on a single line even more */
  @media (min-width: 769px) {
    font-size: 12px;
    line-height: 1.1;
  }

  &:hover {
    background: #f8f9fa;
    color: #212c59;
    transform: translateX(4px);
  }

  &:focus {
    outline: none;
    background: #e3f2fd;
    color: #212c59;
  }

  &.selected {
    background: #212c59;
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(33, 44, 89, 0.3);

    &:hover {
      background: #1a2447;
      transform: translateX(4px);
    }
  }

  &:first-child {
    border-radius: 10px 10px 0 0;
  }

  &:last-child {
    border-radius: 0 0 10px 10px;
  }

  &:only-child {
    border-radius: 10px;
  }
`;

const CheckIcon = styled(Check)`
  width: 16px;
  height: 16px;
  color: #212c59;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${DropdownItem}.selected & {
    opacity: 1;
    color: white;
  }
`;

const EnhancedGenderDropdown = ({
  value,
  onChange,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [buttonRect, setButtonRect] = useState(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const portalRef = useRef(null);
  const scrollYRef = useRef(0);

  const genderOptions = [
    { value: '', label: 'Select gender' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Prefer not to say', label: 'Prefer not to say' }
  ];

  const selectedOption = genderOptions.find(option => option.value === value) || genderOptions[0];

  const checkPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 300; // max-height of dropdown
      
      // Open upward if there's not enough space below but enough space above
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > dropdownHeight);
    }
  }, []);

  const handleToggle = (e) => {
    if (!disabled) {
      e.preventDefault();
      e.stopPropagation();

      if (!isOpen) {
        checkPosition();
        setIsOpening(true);
        setIsOpen(true);
        setTimeout(() => setIsOpening(false), 100);
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleSelect = (option, e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(option.value);
    setIsOpen(false);
  };

  const handleClickOutside = useCallback((event) => {
    const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
    const isInsidePortal = portalRef.current && portalRef.current.contains(event.target);

    if (!isInsideDropdown && !isInsidePortal) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    const preventScroll = (e) => {
      // Prevent scroll on wheel, touchmove, and keydown (arrow keys, space, etc.)
      if (e.type === 'wheel' || e.type === 'touchmove') {
        e.preventDefault();
      }
      if (e.type === 'keydown' && ['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      // Prevent scrolling by blocking scroll events
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('keydown', preventScroll);
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'relative';
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', preventScroll);
      document.body.style.overflow = '';
      document.body.style.position = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', preventScroll);
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, [isOpen, handleClickOutside]);

  return (
    <DropdownContainer ref={dropdownRef} className={className}>
      <DropdownButton
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={isOpen ? 'open' : ''}
        $hasValue={value !== ''}
        style={{ 
          border: isOpen ? '2px solid #212c59' : '2px solid #e9ecef',
          boxShadow: isOpen ? '0 0 0 3px rgba(33, 44, 89, 0.1)' : 'none'
        }}
      >
        <DropdownText>{selectedOption.label}</DropdownText>
        <ChevronIcon />
      </DropdownButton>
      
      {isOpen && createPortal(
        <DropdownMenu ref={portalRef} $isOpen={isOpen} $buttonRect={buttonRect}>
          {genderOptions.map((option) => (
            <DropdownItem
              key={option.value}
              type="button"
              onClick={(e) => handleSelect(option, e)}
              className={value === option.value ? 'selected' : ''}
            >
              <span>{option.label}</span>
              {value === option.value && <CheckIcon />}
            </DropdownItem>
          ))}
        </DropdownMenu>,
        document.body
      )}
    </DropdownContainer>
  );
};

export default EnhancedGenderDropdown;
