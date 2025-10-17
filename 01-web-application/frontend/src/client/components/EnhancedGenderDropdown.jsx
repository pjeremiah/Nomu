import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown, Check } from 'lucide-react';

const DropdownContainer = styled.div`
  position: relative;
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  vertical-align: top;
  align-self: stretch;
  flex: 1;
  min-width: 0;
  margin-top: 0;
  margin-bottom: 0;

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
  width: 100%;
  padding: 8px 12px;
  height: 36px !important;
  box-sizing: border-box;
  line-height: 1.2;
  vertical-align: top;
  background: #ffffff;
  border: 1px solid #e9ecef !important;
  border-radius: 10px !important;
  border-top: 1px solid #e9ecef !important;
  border-right: 1px solid #e9ecef !important;
  border-bottom: 2px solid #e9ecef !important;
  border-left: 1px solid #e9ecef !important;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  font-family: 'Montserrat', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.$hasValue ? '#212c59' : '#a0a0a0'};
  cursor: pointer;
  text-align: left;
  direction: ltr;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  margin: 0;
  outline: none;
  align-self: stretch;
  margin-top: 0;
  margin-bottom: 0;

  /* Match input styling exactly - same as SignUpForm */
  @media (max-width: 768px) {
    width: 100%;
    height: 36px !important;
    padding: 8px 12px;
    font-size: 13px;
    box-sizing: border-box;
    line-height: 1.2;
    vertical-align: middle;
    display: flex;
    align-items: center;
  }

  @media (max-width: 480px) {
    width: 100%;
    height: 36px !important;
    padding: 8px 12px;
    font-size: 13px;
    box-sizing: border-box;
    line-height: 1.2;
    vertical-align: middle;
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
    box-shadow: 0 6px 20px rgba(33, 44, 89, 0.12), 0 3px 10px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }
  }

  &:focus {
    outline: none;
    border-color: #212c59;
    box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1), 0 6px 20px rgba(33, 44, 89, 0.12);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(-1px);
  }

  &.open {
    border-color: #212c59;
    box-shadow: 0 6px 20px rgba(33, 44, 89, 0.12), 0 3px 10px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
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
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: visible;
  max-height: 300px;
  overflow-y: auto;
  transform-origin: top center;

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
      console.log('Dropdown toggle clicked, current state:', isOpen); // Debug log
      
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
    console.log('Gender selected:', option.value); // Debug log
    console.log('Current value before change:', value); // Debug log
    onChange(option.value);
    console.log('onChange called with:', option.value); // Debug log
    setIsOpen(false);
    console.log('Dropdown closed'); // Debug log
  };

  const handleClickOutside = useCallback((event) => {
    console.log('Click outside detected, target:', event.target);
    const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
    const isInsidePortal = portalRef.current && portalRef.current.contains(event.target);
    
    if (!isInsideDropdown && !isInsidePortal) {
      console.log('Closing dropdown due to outside click');
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
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
          border: isOpen ? '2px solid #212c59' : '1px solid #e9ecef',
          boxShadow: isOpen ? '0 0 0 3px rgba(33, 44, 89, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <DropdownText>{selectedOption.label}</DropdownText>
        <ChevronIcon />
      </DropdownButton>
      
      {isOpen && createPortal(
        <DropdownMenu ref={portalRef} $isOpen={isOpen} $buttonRect={buttonRect}>
          {console.log('Rendering dropdown menu with options:', genderOptions)}
          {genderOptions.map((option) => (
            <DropdownItem
              key={option.value}
              type="button"
              onClick={(e) => {
                console.log('Dropdown item clicked:', option.label, option.value);
                handleSelect(option, e);
              }}
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
