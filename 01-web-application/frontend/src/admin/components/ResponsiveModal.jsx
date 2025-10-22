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
          maxWidth: 'clamp(400px, 45vw, 500px)',
          width: 'clamp(70vw, 45vw, 80vw)'
        };
      case 'large':
        return {
          maxWidth: 'clamp(600px, 70vw, 800px)',
          width: 'clamp(80vw, 70vw, 90vw)'
        };
      case 'extra-large':
        return {
          maxWidth: 'clamp(750px, 85vw, 1000px)',
          width: 'clamp(85vw, 85vw, 95vw)'
        };
      default: // medium - professional size
        return {
          maxWidth: 'clamp(500px, 55vw, 650px)',
          width: 'clamp(75vw, 55vw, 85vw)'
        };
    }
  };

  const modalSize = getModalSize();

  return (
    <>
      {/* Overlay Background */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={onHide}
      />
      
      {/* Single Modal Container - No Visual Layers */}
      <div 
        className={`admin-modal ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ffffff',
          borderRadius: 'clamp(12px, 2vw, 20px)',
          border: '1px solid #e9ecef',
          boxShadow: '0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1)',
          width: modalSize.width,
          maxWidth: modalSize.maxWidth,
          height: 'auto',
          maxHeight: '90vh',
          minHeight: 'auto',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out',
          overflow: 'visible'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          position: 'relative', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.6rem, 1.2vw, 0.8rem)',
          background: '#ffffff',
          borderBottom: '1px solid #e9ecef',
          flexShrink: 0
        }}>
          <h3 style={{
            margin: 0,
            color: '#212c59',
            fontWeight: '700',
            fontSize: 'clamp(0.85rem, 1.6vw, 1rem)',
            fontFamily: "'Montserrat', sans-serif",
            letterSpacing: '-0.025em'
          }}>
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onHide}
              style={{
                background: 'rgba(33, 44, 89, 0.08)',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                color: '#212c59',
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
              onMouseEnter={(e) => {
                e.target.style.background = '#212c59';
                e.target.style.color = 'white';
                e.target.style.transform = 'scale(1.1)';
                e.target.style.boxShadow = '0 4px 12px rgba(33, 44, 89, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(33, 44, 89, 0.1)';
                e.target.style.color = '#212c59';
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <FaTimes color="#212c59" size={18} />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div style={{
          padding: 'clamp(0.4rem, 0.8vw, 0.6rem) clamp(0.6rem, 1.2vw, 0.8rem)',
          flex: 1,
          overflowY: 'auto',
          minHeight: 'auto',
          maxHeight: 'calc(90vh - 120px)',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {children}
        </div>
      </div>

      {/* Add CSS animations and responsive styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Responsive adjustments for desktop/laptop screens and zoom levels */
        
        /* Base modal styles - professional design */
        .admin-modal {
          max-height: 90vh !important;
          width: clamp(340px, 38vw, 450px) !important; /* ultra-tight width */
          max-width: 450px !important;
          overflow: visible !important;
        }

        /* Large desktop screens (1920px+) */
        @media (min-width: 1920px) {
          .admin-modal {
            width: clamp(400px, 40vw, 560px) !important;
            max-width: 560px !important;
            max-height: 90vh !important;
          }
        }

        /* Standard desktop screens (1200px - 1919px) */
        @media (min-width: 1200px) and (max-width: 1919px) {
          .admin-modal {
            width: clamp(380px, 38vw, 520px) !important;
            max-width: 520px !important;
            max-height: 90vh !important;
          }
        }

        /* Small desktop/large laptop screens (1024px - 1199px) */
        @media (min-width: 1024px) and (max-width: 1199px) {
          .admin-modal {
            width: clamp(360px, 40vw, 500px) !important;
            max-width: 500px !important;
            max-height: 90vh !important;
          }
        }

        /* Laptop screens (768px - 1023px) - minimum admin access */
        @media (min-width: 768px) and (max-width: 1023px) {
          .admin-modal {
            width: clamp(340px, 44vw, 460px) !important;
            max-width: 460px !important;
            max-height: 90vh !important;
          }
        }

        /* High zoom levels (150%, 170%, etc.) - ensure modal stays visible */
        @media (min-resolution: 1.5dppx) {
          .admin-modal {
            max-height: 90vh !important;
            width: clamp(320px, 38vw, 440px) !important;
          }
        }

        @media (min-resolution: 2dppx) {
          .admin-modal {
            max-height: 90vh !important;
            width: clamp(300px, 40vw, 420px) !important;
          }
        }

        /* Very short screens or high zoom levels on desktop/laptop */
        @media (max-height: 600px) and (min-width: 768px) {
          .admin-modal {
            max-height: 85vh !important;
          }
        }

        @media (max-height: 500px) and (min-width: 768px) {
          .admin-modal {
            max-height: 80vh !important;
          }
        }

        /* Ultra-wide screens */
        @media (min-width: 2560px) {
          .admin-modal {
            width: clamp(400px, 32vw, 580px) !important;
            max-width: 580px !important;
          }
        }

        /* Ensure modal content is scrollable when needed */
        .admin-modal .modal-content {
          overflow-y: auto;
          max-height: calc(90vh - 120px);
        }

        /* Rectangle shapes for all form elements - like Confirm Logout modal */
        .admin-modal input[type="text"],
        .admin-modal input[type="email"],
        .admin-modal input[type="password"],
        .admin-modal select,
        .admin-modal textarea {
          border-radius: 4px !important;
          font-size: 0.8rem !important;   /* ultra-small fonts */
          height: 30px !important;       /* ultra-short controls */
        }
        
        .admin-modal button {
          border-radius: 4px !important;
          font-size: 0.8rem !important;   /* ultra-small buttons */
          padding: 5px 10px !important;
        }

        /* Normalize margins inside modal to remove extra top/bottom whitespace */
        .admin-modal h1, .admin-modal h2, .admin-modal h3,
        .admin-modal p, .admin-modal hr,
        .admin-modal .divider { margin-top: 0.5rem !important; margin-bottom: 0.5rem !important; }
        .admin-modal hr { border: none; border-top: 1px solid #e9ecef; }
        
        /* Reduce spacing between form elements */
        .admin-modal .form-group {
          margin-bottom: 0.75rem !important;
        }
        
        .admin-modal .form-group:last-child {
          margin-bottom: 0 !important;
        }
        
        .admin-modal .form-row {
          margin-bottom: 0.5rem !important;
        }
        
        .admin-modal .form-row:last-child {
          margin-bottom: 0 !important;
        }

        /* Remove any visual layering effects */
        .admin-modal * {
          box-shadow: none !important;
        }
        
        .admin-modal {
          box-shadow: 0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </>
  );
};

export default ResponsiveModal;