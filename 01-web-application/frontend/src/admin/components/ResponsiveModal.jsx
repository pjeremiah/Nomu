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
          maxWidth: 'clamp(650px, 70vw, 800px)',
          width: 'clamp(80vw, 70vw, 90vw)'
        };
      case 'extra-large':
        return {
          maxWidth: 'clamp(800px, 85vw, 1000px)',
          width: 'clamp(85vw, 85vw, 95vw)'
        };
      default: // medium - optimized for desktop/laptop
        return {
          maxWidth: 'clamp(450px, 55vw, 600px)',
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
          maxHeight: 'calc(100vh - 40px)',
          minHeight: 'auto',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease-out',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          position: 'relative', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(1rem, 2.5vw, 2rem) clamp(1.5rem, 3vw, 2rem)',
          background: '#ffffff',
          borderBottom: '1px solid #e9ecef',
          flexShrink: 0
        }}>
          <h3 style={{
            margin: 0,
            color: '#212c59',
            fontWeight: '700',
            fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)',
            fontFamily: "'Montserrat', sans-serif"
          }}>
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onHide}
              style={{
                background: 'rgba(33, 44, 89, 0.1)',
                border: 'none',
                fontSize: '1.1rem',
                cursor: 'pointer',
                color: '#212c59',
                padding: '8px',
                borderRadius: '50%',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600'
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
              <FaTimes />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div style={{
          padding: 'clamp(1rem, 2.5vw, 2rem) clamp(1.5rem, 3vw, 2rem)',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          maxHeight: 'calc(100vh - clamp(120px, 20vw, 200px))',
          background: '#ffffff'
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
        
        /* Base modal styles - optimized for all zoom levels */
        .admin-modal {
          max-height: calc(100vh - 40px) !important;
          width: clamp(400px, 60vw, 600px) !important;
          max-width: 600px !important;
        }

        /* Large desktop screens (1920px+) */
        @media (min-width: 1920px) {
          .admin-modal {
            width: clamp(500px, 50vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - 60px) !important;
          }
        }

        /* Standard desktop screens (1200px - 1919px) */
        @media (min-width: 1200px) and (max-width: 1919px) {
          .admin-modal {
            width: clamp(450px, 55vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - 50px) !important;
          }
        }

        /* Small desktop/large laptop screens (1024px - 1199px) */
        @media (min-width: 1024px) and (max-width: 1199px) {
          .admin-modal {
            width: clamp(400px, 60vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - 40px) !important;
          }
        }

        /* Laptop screens (768px - 1023px) - minimum admin access */
        @media (min-width: 768px) and (max-width: 1023px) {
          .admin-modal {
            width: clamp(350px, 70vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - 30px) !important;
          }
        }

        /* High zoom levels (150%, 170%, etc.) - ensure modal stays visible */
        @media (min-resolution: 1.5dppx) {
          .admin-modal {
            max-height: calc(100vh - 20px) !important;
            width: clamp(350px, 65vw, 600px) !important;
          }
        }

        @media (min-resolution: 2dppx) {
          .admin-modal {
            max-height: calc(100vh - 15px) !important;
            width: clamp(320px, 70vw, 600px) !important;
          }
        }

        /* Very short screens or high zoom levels on desktop/laptop */
        @media (max-height: 600px) and (min-width: 768px) {
          .admin-modal {
            max-height: calc(100vh - 10px) !important;
          }
        }

        @media (max-height: 500px) and (min-width: 768px) {
          .admin-modal {
            max-height: calc(100vh - 5px) !important;
          }
        }

        /* Ultra-wide screens */
        @media (min-width: 2560px) {
          .admin-modal {
            width: clamp(500px, 40vw, 700px) !important;
            max-width: 700px !important;
          }
        }

        /* Ensure modal content is scrollable when needed */
        .admin-modal .modal-content {
          overflow-y: auto;
          max-height: calc(100vh - 120px);
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
