import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown, Check } from 'lucide-react';

const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
  min-width: ${props => props.$minWidth || '140px'};
  width: ${props => props.$width || 'auto'};
`;

const DropdownButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  color: #495057;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(0, 48, 135, 0.02), rgba(0, 48, 135, 0.01));
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    border-color: #003087;
    box-shadow: 0 6px 20px rgba(0, 48, 135, 0.12), 0 3px 10px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);

    &::before {
      opacity: 1;
    }
  }

  &:focus {
    outline: none;
    border-color: #003087;
    box-shadow: 0 0 0 4px rgba(0, 48, 135, 0.1), 0 6px 20px rgba(0, 48, 135, 0.12);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(-1px);
  }

  &.open {
    border-color: #003087;
    box-shadow: 0 6px 20px rgba(0, 48, 135, 0.12), 0 3px 10px rgba(0, 0, 0, 0.08);
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
    color: #003087;
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
  z-index: 10001;
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
  padding: 0.75rem 1rem;
  background: white;
  border: none;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.95rem;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  position: relative;

  &:hover {
    background: #f8f9fa;
    color: #495057;
    transform: none;
  }

  &:focus {
    outline: none;
    background: #f8f9fa;
    color: #495057;
  }

  &.selected {
    background: linear-gradient(135deg, #003087 0%, #212c59 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 48, 135, 0.3);

    &:hover {
      background: linear-gradient(135deg, #002a6b 0%, #1a2450 100%);
      transform: none;
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
  color: #003087;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${DropdownItem}.selected & {
    opacity: 1;
    color: white;
  }
`;

const DropdownLabel = styled.label`
  display: block;
  font-family: 'Montserrat', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PortalDropdownMenu = styled.div`
  position: fixed;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 20px rgba(0, 0, 0, 0.1);
  z-index: 10001;
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

const EnhancedDropdown = ({
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  label,
  minWidth,
  width,
  disabled = false,
  className = "",
  variant = "default" // default, compact, large
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [usePortal, setUsePortal] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

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
        // Check if we're inside a modal
        const modal = buttonRef.current?.closest('.admin-modal');
        const isInModal = !!modal;
        setUsePortal(isInModal);
        
        if (isInModal && buttonRef.current) {
          // Calculate position for portal
          const rect = buttonRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
          });
        }
        
        checkPosition();
        setIsOpening(true);
        setIsOpen(true);
        // Reset opening state after a short delay
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
    // Check if click is on portal dropdown menu
    const isPortalMenuClick = event.target.closest('[data-portal-dropdown]');
    
    if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !isPortalMenuClick) {
      // Don't close if we're in the opening state
      if (isOpening) return;
      
      // Check if the click is on a modal backdrop or modal content
      const isModalClick = event.target.closest('.admin-modal') || 
                          event.target.closest('.modal-backdrop') ||
                          event.target.closest('.admin-modal-overlay');
      
      // Only close if it's not a modal click or if it's specifically clicking outside the modal
      if (!isModalClick || event.target.classList.contains('admin-modal-overlay')) {
        setIsOpen(false);
      }
    }
  }, [isOpening]);

  // Check if dropdown is inside a modal and adjust positioning
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const modal = buttonRef.current.closest('.admin-modal');
      if (modal) {
        // Ensure dropdown is positioned relative to viewport when inside modal
        const dropdownMenu = dropdownRef.current?.querySelector('[data-dropdown-menu]');
        if (dropdownMenu) {
          dropdownMenu.style.position = 'fixed';
          const rect = buttonRef.current.getBoundingClientRect();
          dropdownMenu.style.top = `${rect.bottom + 4}px`;
          dropdownMenu.style.left = `${rect.left}px`;
          dropdownMenu.style.width = `${rect.width}px`;
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Close dropdown when modal is closed
  useEffect(() => {
    const handleModalClose = () => {
      setIsOpen(false);
    };

    // Listen for custom modal close events
    document.addEventListener('modalClose', handleModalClose);
    
    return () => {
      document.removeEventListener('modalClose', handleModalClose);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value);

  const renderDropdownMenu = () => {
    const menuItems = options.map((option, index) => (
      <DropdownItem
        key={option.value}
        onClick={(e) => handleSelect(option, e)}
        className={value === option.value ? 'selected' : ''}
      >
        <span>{option.label}</span>
        {value === option.value && <CheckIcon />}
      </DropdownItem>
    ));

    if (usePortal && isOpen) {
      return createPortal(
        <PortalDropdownMenu
          data-portal-dropdown
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            display: 'block'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {menuItems}
        </PortalDropdownMenu>,
        document.body
      );
    }

    return (
      <DropdownMenu $isOpen={isOpen} $openUpward={openUpward} data-dropdown-menu style={{ 
        display: isOpen ? 'block' : 'none',
        position: 'absolute',
        zIndex: 10001
      }}>
        {menuItems}
      </DropdownMenu>
    );
  };

  return (
    <DropdownContainer 
      ref={dropdownRef}
      $minWidth={minWidth}
      $width={width}
      className={`enhanced-dropdown-container ${className}`}
    >
      {label && <DropdownLabel>{label}</DropdownLabel>}
      <DropdownButton
        ref={buttonRef}
        onClick={handleToggle}
        className={isOpen ? 'open' : ''}
        disabled={disabled}
      >
        <DropdownText>
          {selectedOption ? selectedOption.label : placeholder}
        </DropdownText>
        <ChevronIcon />
      </DropdownButton>
      {renderDropdownMenu()}
    </DropdownContainer>
  );
};

export default EnhancedDropdown;
