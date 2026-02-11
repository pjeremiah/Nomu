// ResponsiveModal.jsx - Standardized modal with uniform sizing and button styles
import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const ResponsiveModal = ({ 
  show, 
  onHide, 
  title, 
  children, 
  size = 'medium',
  className = '',
  showCloseButton = false 
}) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  // STANDARDIZED MODAL SIZING - Optimized for 1366x768 screens
  const getModalSize = () => {
    switch (size) {
      case 'small':
        return {
          maxWidth: '380px',
          width: '85%'
        };
      case 'large':
        return {
          maxWidth: '500px',
          width: '90%'
        };
      case 'extra-large':
        return {
          maxWidth: '600px',
          width: '92%'
        };
      default: // medium - Standard size for all modals
        return {
          maxWidth: '420px',
          width: '88%'
        };
    }
  };

  const modalSize = getModalSize();

  return (
    <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease-out',
      padding: '15px', // STANDARDIZED PADDING
      boxSizing: 'border-box'
    }} onClick={onHide}>
      <div 
        className={`admin-modal ${className}`}
        data-size={size}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#f8f9fa',
          borderRadius: '12px', // SMALLER BORDER RADIUS
          padding: '8px', // EXTREME COMPACT PADDING
          width: '100%',
          maxWidth: modalSize.maxWidth,
          maxHeight: 'calc(100vh - 80px)', // INCREASED HEIGHT to show all content
          overflow: 'auto',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)' // SMALLER SHADOW
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'center', // CENTERED TITLE
          alignItems: 'center',
          marginBottom: '4px', // EXTREME COMPACT MARGIN
          paddingBottom: '4px', // EXTREME COMPACT PADDING
          borderBottom: '1px solid #e9ecef'
        }}>
          <h3 style={{
            margin: 0,
            color: '#212c59',
            fontWeight: '700',
            fontSize: '1rem', // EXTREME COMPACT FONT SIZE
            textAlign: 'center' // CENTERED TEXT
          }}>{title}</h3>
          {showCloseButton && (
            <button
              onClick={onHide}
              style={{
                background: '#212c59',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                color: '#ffffff',
                padding: '8px',
                borderRadius: '50%',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '500'
              }}
            >
              <FaTimes color="#ffffff" size={16} />
            </button>
          )}
        </div>
          {children}
      </div>

      {/* STANDARDIZED BUTTON STYLES - Applied to all modals */}
      <style>{`
        .admin-modal .admin-btn-primary {
          background: white !important;
          color: #212c59 !important;
          border: 2px solid #212c59 !important;
          border-radius: 8px !important;
          padding: 8px 20px !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          cursor: pointer !important;
          box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1) !important;
          flex: 1 !important;
          font-size: 0.85rem !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 36px !important;
          min-height: 36px !important;
          min-width: 120px !important;
        }
        
        .admin-modal .admin-btn-primary:hover {
          background: #212c59 !important;
          border-color: #212c59 !important;
          color: white !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3) !important;
        }
        
        
        .admin-modal .admin-btn-danger {
          background: white !important;
          color: #dc3545 !important;
          border: 2px solid #dc3545 !important;
          border-radius: 6px !important;
          padding: 6px 16px !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          cursor: pointer !important;
          box-shadow: 0 1px 4px rgba(220, 53, 69, 0.1) !important;
          flex: 1 !important;
          font-size: 0.8rem !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 32px !important;
          min-height: 32px !important;
        }
        
        .admin-modal .admin-btn-danger:hover {
          background: #dc3545 !important;
          border-color: #dc3545 !important;
          color: white !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
        }
        
        .admin-modal .admin-btn-success {
          background: white !important;
          color: #28a745 !important;
          border: 2px solid #28a745 !important;
          border-radius: 6px !important;
          padding: 6px 16px !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          cursor: pointer !important;
          box-shadow: 0 1px 4px rgba(40, 167, 69, 0.1) !important;
          flex: 1 !important;
          font-size: 0.8rem !important;
          white-space: nowrap !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 32px !important;
          min-height: 32px !important;
        }
        
        .admin-modal .admin-btn-success:hover {
          background: #28a745 !important;
          border-color: #28a745 !important;
          color: white !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3) !important;
        }
        
        .admin-modal .admin-form-actions {
          display: flex !important;
          gap: 12px !important;
          justify-content: center !important;
          margin-top: 12px !important;
          margin-bottom: 8px !important;
          padding: 0 8px !important;
          width: 100% !important;
        }
        
        /* ULTRA COMPACT form styling - NO MASSIVE SPACES */
        .admin-modal .form-group {
          margin-bottom: 4px !important;
        }
        
        .admin-modal .form-group label {
          margin-bottom: 2px !important;
          font-size: 0.85rem !important;
          font-weight: 600 !important;
          color: #212c59 !important;
        }
        
        .admin-modal .form-control {
          padding: 6px 10px !important;
          font-size: 0.8rem !important;
          border: 2px solid #e9ecef !important;
          border-radius: 6px !important;
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          width: 100% !important;
          box-sizing: border-box !important;
          transition: border-color 0.3s ease !important;
        }
        
        .admin-modal .form-control:focus {
          border-color: #212c59 !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1) !important;
        }
        
        .admin-modal textarea.form-control {
          height: 60px !important;
          min-height: 60px !important;
          resize: vertical !important;
        }
        
        .admin-modal .admin-form-group {
          margin-bottom: 4px !important;
          width: 100% !important;
        }
        
        .admin-modal .admin-form-group label {
          display: block !important;
          margin-bottom: 2px !important;
          font-weight: 600 !important;
          color: #212c59 !important;
          font-size: 0.85rem !important;
        }
        
        .admin-modal .admin-form-group input,
        .admin-modal .admin-form-group select,
        .admin-modal .admin-form-group textarea {
          width: 100% !important;
          padding: 6px 10px !important;
          border: 2px solid #e9ecef !important;
          border-radius: 6px !important;
          font-size: 0.8rem !important;
          transition: border-color 0.3s ease !important;
          background-color: #f8f9fa !important;
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          box-sizing: border-box !important;
        }
        
        .admin-modal .admin-form-group input:focus,
        .admin-modal .admin-form-group select:focus,
        .admin-modal .admin-form-group textarea:focus {
          border-color: #212c59 !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1) !important;
        }
        
        /* ULTRA COMPACT side-by-side elements - NO MASSIVE GAPS */
        .admin-modal .row {
          display: flex !important;
          gap: 6px !important;
          margin-bottom: 4px !important;
          align-items: flex-start !important;
        }
        
        .admin-modal .col {
          flex: 1 !important;
          min-width: 0 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        .admin-modal .col-6 {
          flex: 0 0 calc(50% - 3px) !important;
          max-width: calc(50% - 3px) !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        /* ULTRA COMPACT form spacing - NO MASSIVE SPACES */
        .admin-modal .mb-3 {
          margin-bottom: 4px !important;
        }
        
        .admin-modal .mb-4 {
          margin-bottom: 6px !important;
        }
        
        /* Ensure all form elements have consistent width */
        .admin-modal .admin-form-group {
          margin-bottom: 4px !important;
          width: 100% !important;
        }
        
        .admin-modal .admin-form-group input,
        .admin-modal .admin-form-group select,
        .admin-modal .admin-form-group textarea {
          width: 100% !important;
          box-sizing: border-box !important;
        }
        
        /* Ensure buttons are visible */
        .admin-modal .admin-form {
          padding-bottom: 8px !important;
        }
        
        /* Fix dropdown sizing to match other form elements - PROPER STYLE */
        .admin-modal .enhanced-dropdown,
        .admin-modal .enhanced-dropdown .dropdown-button,
        .admin-modal .enhanced-dropdown .dropdown-button input,
        .admin-modal .dropdown,
        .admin-modal .dropdown button,
        .admin-modal .dropdown input,
        .admin-modal select {
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          padding: 6px 10px !important;
          border: 2px solid #e9ecef !important;
          border-radius: 6px !important;
          background-color: #f8f9fa !important;
          font-size: 0.8rem !important;
        }
        
        .admin-modal .enhanced-dropdown .dropdown-button {
          padding: 6px 10px !important;
          border: 2px solid #e9ecef !important;
          border-radius: 6px !important;
          background-color: #f8f9fa !important;
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
        }
        
        .admin-modal .enhanced-dropdown .dropdown-button input {
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          padding: 6px 10px !important;
          border: none !important;
          background-color: transparent !important;
        }
        
        /* Fix React Select components - PROPER STYLE */
        .admin-modal .react-select__control,
        .admin-modal .react-select__value-container,
        .admin-modal .react-select__input-container,
        .admin-modal .react-select__placeholder,
        .admin-modal .react-select__single-value {
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          padding: 6px 10px !important;
          border: 2px solid #e9ecef !important;
          border-radius: 6px !important;
          background-color: #f8f9fa !important;
          font-size: 0.8rem !important;
        }
        
        .admin-modal .react-select__control {
          min-height: 32px !important;
          height: 32px !important;
        }
        
        .admin-modal .react-select__value-container {
          padding: 0 !important;
          height: 32px !important;
        }
        
        .admin-modal .react-select__input-container {
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .admin-modal .admin-form-group input:focus,
        .admin-modal .admin-form-group select:focus,
        .admin-modal .admin-form-group textarea:focus {
          outline: none !important;
          border-color: #212c59 !important;
          box-shadow: 0 0 0 3px rgba(33, 44, 89, 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default ResponsiveModal;
