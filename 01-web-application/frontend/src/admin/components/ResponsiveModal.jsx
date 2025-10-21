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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease-out',
        padding: 'clamp(10px, 2vw, 30px)',
        boxSizing: 'border-box',
        overflow: 'auto',
        minHeight: '100vh'
      }}
      onClick={onHide}
    >
      <div 
        className={`admin-modal ${className}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: 'slideIn 0.3s ease-out',
          transform: 'scale(1)',
          boxShadow: '0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          height: 'auto',
          maxHeight: 'calc(100vh - clamp(20px, 4vw, 60px))',
          minHeight: 'auto',
          width: modalSize.width,
          maxWidth: modalSize.maxWidth,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderRadius: 'clamp(12px, 2vw, 20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'relative',
          transformOrigin: 'center',
          zIndex: 10001,
          overflow: 'hidden',
          margin: 'auto'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          position: 'relative', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'clamp(1rem, 2.5vw, 2rem) clamp(1.5rem, 3vw, 2rem)',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          borderRadius: 'clamp(12px, 2vw, 20px) clamp(12px, 2vw, 20px) 0 0',
          borderBottom: '2px solid rgba(33, 44, 89, 0.1)',
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
          maxHeight: 'calc(100vh - clamp(120px, 20vw, 200px))'
        }}>
          {children}
</div>
      </div>

      {/* Add CSS animations */}
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
        
        /* Large desktop screens (1920px+) */
        @media (min-width: 1920px) {
          .admin-modal {
            width: clamp(500px, 50vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - clamp(40px, 5vw, 80px)) !important;
          }
        }

        /* Standard desktop screens (1200px - 1919px) */
        @media (min-width: 1200px) and (max-width: 1919px) {
          .admin-modal {
            width: clamp(450px, 55vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - clamp(30px, 4vw, 60px)) !important;
          }
        }

        /* Small desktop/large laptop screens (1024px - 1199px) */
        @media (min-width: 1024px) and (max-width: 1199px) {
          .admin-modal {
            width: clamp(400px, 60vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - clamp(25px, 3vw, 50px)) !important;
          }
        }

        /* Laptop screens (768px - 1023px) - minimum admin access */
        @media (min-width: 768px) and (max-width: 1023px) {
          .admin-modal {
            width: clamp(350px, 70vw, 600px) !important;
            max-width: 600px !important;
            max-height: calc(100vh - clamp(20px, 2.5vw, 40px)) !important;
            margin: clamp(10px, 1.5vw, 20px);
          }
        }

        /* High DPI and zoom level adjustments for desktop/laptop */
        @media (min-resolution: 2dppx) and (min-width: 768px) {
          .admin-modal {
            max-height: calc(100vh - clamp(25px, 4vw, 60px)) !important;
          }
        }

        /* Very short screens or high zoom levels on desktop/laptop */
        @media (max-height: 600px) and (min-width: 768px) {
          .admin-modal {
            max-height: calc(100vh - 15px) !important;
            margin: 10px;
          }
        }

        @media (max-height: 500px) and (min-width: 768px) {
          .admin-modal {
            max-height: calc(100vh - 10px) !important;
            margin: 5px;
          }
        }

        /* Ultra-wide screens */
        @media (min-width: 2560px) {
          .admin-modal {
            width: clamp(500px, 40vw, 700px) !important;
            max-width: 700px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResponsiveModal;
