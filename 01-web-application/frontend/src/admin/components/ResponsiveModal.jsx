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
          maxWidth: '500px',
          width: '90vw'
        };
      case 'large':
        return {
          maxWidth: '800px',
          width: '95vw'
        };
      case 'extra-large':
        return {
          maxWidth: '1000px',
          width: '98vw'
        };
      default: // medium
        return {
          maxWidth: '600px',
          width: '90vw'
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
        padding: '20px',
        boxSizing: 'border-box',
        overflow: 'auto'
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
          maxHeight: '85vh',
          width: modalSize.width,
          maxWidth: modalSize.maxWidth,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          position: 'relative',
          transformOrigin: 'center',
          zIndex: 10001,
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          position: 'relative', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem 2rem',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          borderRadius: '20px 20px 0 0',
          borderBottom: '2px solid rgba(33, 44, 89, 0.1)',
          flexShrink: 0
        }}>
          <h3 style={{
            margin: 0,
            color: '#212c59',
            fontWeight: '700',
            fontSize: '1.5rem',
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
          padding: '1.5rem 2rem',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          maxHeight: 'calc(85vh - 120px)'
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

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .admin-modal {
            width: 95vw !important;
            max-width: 95vw !important;
            margin: 10px;
            max-height: calc(100vh - 20px) !important;
          }
        }

        @media (max-width: 480px) {
          .admin-modal {
            width: 98vw !important;
            max-width: 98vw !important;
            margin: 5px;
            max-height: calc(100vh - 10px) !important;
          }
          
          .admin-modal h3 {
            font-size: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResponsiveModal;
