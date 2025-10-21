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
          maxWidth: 'clamp(400px, 50vw, 500px)',
          width: 'clamp(85vw, 50vw, 90vw)'
        };
      case 'large':
        return {
          maxWidth: 'clamp(700px, 80vw, 800px)',
          width: 'clamp(90vw, 80vw, 95vw)'
        };
      case 'extra-large':
        return {
          maxWidth: 'clamp(900px, 95vw, 1000px)',
          width: 'clamp(95vw, 95vw, 98vw)'
        };
      default: // medium
        return {
          maxWidth: 'clamp(500px, 60vw, 600px)',
          width: 'clamp(85vw, 60vw, 90vw)'
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

        /* Responsive adjustments for different screen sizes and zoom levels */
        @media (max-width: 1200px) {
          .admin-modal {
            width: 92vw !important;
            max-width: 92vw !important;
            max-height: calc(100vh - clamp(15px, 3vw, 40px)) !important;
          }
        }

        @media (max-width: 768px) {
          .admin-modal {
            width: 95vw !important;
            max-width: 95vw !important;
            margin: clamp(5px, 1vw, 15px);
            max-height: calc(100vh - clamp(10px, 2vw, 30px)) !important;
          }
        }

        @media (max-width: 480px) {
          .admin-modal {
            width: 98vw !important;
            max-width: 98vw !important;
            margin: clamp(3px, 0.5vw, 10px);
            max-height: calc(100vh - clamp(5px, 1vw, 20px)) !important;
          }
          
          .admin-modal h3 {
            font-size: clamp(1.1rem, 2vw, 1.25rem) !important;
          }
        }

        /* High DPI and zoom level adjustments */
        @media (min-resolution: 2dppx) {
          .admin-modal {
            max-height: calc(100vh - clamp(20px, 4vw, 50px)) !important;
          }
        }

        /* Very small screens or high zoom levels */
        @media (max-height: 600px) {
          .admin-modal {
            max-height: calc(100vh - 10px) !important;
            margin: 5px;
          }
        }

        @media (max-height: 400px) {
          .admin-modal {
            max-height: calc(100vh - 5px) !important;
            margin: 2px;
          }
        }
      `}</style>
    </div>
  );
};

export default ResponsiveModal;
