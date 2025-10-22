import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ResponsiveModal = ({ 
  show, 
  onHide, 
  title, 
  children, 
  size = 'medium',
  className = '',
  showCloseButton = true 
}) => {
  if (!show) return null;

  const getModalSize = () => {
    switch (size) {
      case 'small':
        return {
          maxWidth: '320px',
          width: '90%'
        };
      case 'large':
        return {
          maxWidth: '500px',
          width: '90%'
        };
      case 'extra-large':
        return {
          maxWidth: '600px',
          width: '90%'
        };
      default: // medium - Sign In modal size
        return {
          maxWidth: '420px',
          width: '90%'
        };
    }
  };

  const modalSize = getModalSize();

  return (
    <>
      {/* Overlay Background - exactly like Sign In modal */}
      <div
        className="signin-modal-overlay"
        onClick={onHide}
      />
      
      {/* Modal Container - exactly like Sign In modal */}
      <div 
        className={`signin-modal-content ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: modalSize.maxWidth,
          width: modalSize.width
        }}
      >
        {/* Close Button - exactly like Sign In modal */}
        {showCloseButton && (
          <button 
            className="signin-close-button" 
            onClick={onHide}
          >
            <FaTimes />
          </button>
        )}
        
        {/* Title - exactly like Sign In modal */}
        <h2 style={{
          color: '#212c59',
          fontSize: '1.5rem',
          fontWeight: '700',
          marginBottom: '1.5rem',
          textAlign: 'center',
          fontFamily: "'Montserrat', sans-serif",
          borderBottom: '2px solid #212c59',
          paddingBottom: '0.5rem'
        }}>
          {title}
        </h2>
        
        {/* Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {children}
        </div>
      </div>

      {/* Add CSS animations and responsive styles - exactly like Sign In modal */}
      <style>{`
        .signin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          box-sizing: border-box;
          animation: fadeIn 0.3s ease-out;
        }

        .signin-modal-content {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          padding: 2.5rem;
          border-radius: 20px;
          position: relative;
          box-shadow: 
            0 20px 60px rgba(33, 44, 89, 0.3),
            0 8px 25px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          animation: modalSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
        }

        .signin-close-button {
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
        }

        .signin-close-button:hover {
          background: #212c59;
          color: white;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3);
        }

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

        /* Responsive adjustments - exactly like Sign In modal */
        @media (max-width: 768px) {
          .signin-modal-content {
            width: 96% !important;
            max-width: none !important;
            padding: 1rem !important;
            border-radius: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .signin-modal-content {
            width: 98% !important;
            max-width: none !important;
            padding: 0.75rem !important;
            border-radius: 12px !important;
          }
        }

        /* Form styling to match Sign In modal */
        .signin-modal-content input[type="text"],
        .signin-modal-content input[type="email"],
        .signin-modal-content input[type="password"],
        .signin-modal-content select,
        .signin-modal-content textarea {
          font-size: 13px !important;
          padding: 8px 12px !important;
          height: 36px !important;
          box-sizing: border-box !important;
          line-height: 1.2 !important;
          vertical-align: top !important;
          display: flex !important;
          align-items: center !important;
          border: 1px solid #e9ecef !important;
          border-radius: 10px !important;
          border-top: 1px solid #e9ecef !important;
          border-right: 1px solid #e9ecef !important;
          border-bottom: 2px solid #e9ecef !important;
          border-left: 1px solid #e9ecef !important;
          outline: none !important;
          background: white !important;
          color: #212c59 !important;
          font-family: 'Montserrat', sans-serif !important;
        }

        .signin-modal-content input::placeholder {
          color: #a0a0a0 !important;
          opacity: 1 !important;
        }

        .signin-modal-content button {
          background: #212c59 !important;
          color: white !important;
          border: 2px solid #212c59 !important;
          padding: 14px 24px !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          width: 100% !important;
          font-size: 16px !important;
          height: 48px !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1) !important;
          font-family: 'Montserrat', sans-serif !important;
        }

        .signin-modal-content button:hover:not(:disabled) {
          background: #1a2447 !important;
          border-color: #1a2447 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3) !important;
        }

        .signin-modal-content button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }

        .signin-modal-content label {
          color: #212c59 !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          margin-bottom: 4px !important;
          font-family: 'Montserrat', sans-serif !important;
        }

        /* Cancel button styling */
        .signin-modal-content .cancel-button {
          background: white !important;
          color: #b08d57 !important;
          border: 2px solid #b08d57 !important;
          padding: 14px 24px !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          width: 100% !important;
          font-size: 16px !important;
          height: 48px !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1) !important;
        }

        .signin-modal-content .cancel-button:hover:not(:disabled) {
          background: #f8f6f0 !important;
          border-color: #b08d57 !important;
          color: #b08d57 !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
        }
      `}</style>
    </>
  );
};

export default ResponsiveModal;