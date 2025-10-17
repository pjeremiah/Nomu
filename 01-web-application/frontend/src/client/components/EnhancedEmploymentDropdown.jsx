import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { ChevronDown, Check } from 'lucide-react';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.$hasValue ? '#212c59' : '#a0a0a0'};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  margin-top: 6px;

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
  width: 16px;
  height: 16px;
  color: #6b7280;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-left: 0.5rem;
  flex-shrink: 0;

  ${DropdownButton}.open & {
    transform: rotate(180deg);
    color: #212c59;
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: ${props => props.$openUpward ? 'auto' : '100%'};
  bottom: ${props => props.$openUpward ? '100%' : 'auto'};
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  margin-top: ${props => props.$openUpward ? '0' : '4px'};
  margin-bottom: ${props => props.$openUpward ? '4px' : '0'};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => {
    if (!props.$isOpen) return 'translateY(-10px)';
    return props.$openUpward ? 'translateY(0)' : 'translateY(0)';
  }};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  max-height: 300px;
  overflow-y: auto;

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
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: none;
  font-family: 'Montserrat', sans-serif;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;

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

const EnhancedEmploymentDropdown = ({
  value,
  onChange,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const employmentOptions = [
    { value: '', label: 'Select employment status' },
    { value: 'Student', label: 'Student' },
    { value: 'Employed', label: 'Employed' },
    { value: 'Unemployed', label: 'Unemployed' },
    { value: 'Prefer not to say', label: 'Prefer not to say' }
  ];

  const selectedOption = employmentOptions.find(option => option.value === value) || employmentOptions[0];

  const checkPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
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
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
      >
        <DropdownText>{selectedOption.label}</DropdownText>
        <ChevronIcon />
      </DropdownButton>
      
      <DropdownMenu $isOpen={isOpen} $openUpward={openUpward}>
        {employmentOptions.map((option) => (
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
      </DropdownMenu>
    </DropdownContainer>
  );
};

export default EnhancedEmploymentDropdown;