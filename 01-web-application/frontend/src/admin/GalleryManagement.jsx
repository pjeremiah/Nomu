import React from 'react';

const GalleryManagement = () => {
  console.log('GalleryManagement component is rendering!');
  
  return (
    <div style={{
      padding: '2rem',
      fontFamily: "'Montserrat', sans-serif",
      color: '#212c59',
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: '#212c59',
        margin: '0 0 1rem 0',
        fontFamily: "'Montserrat', sans-serif"
      }}>
        Gallery Management
      </h1>
      
      <div style={{
        background: '#fff',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#212c59',
          margin: '0 0 1rem 0'
        }}>
          Gallery Posts (0)
        </h2>
        
        <p style={{
          color: '#6c757d',
          fontSize: '1rem',
          margin: '0 0 1rem 0'
        }}>
          This is a test to see if the component renders at all.
        </p>
        
        <div style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '2px dashed #e9ecef'
        }}>
          <h3 style={{
            color: '#6c757d',
            margin: '0 0 0.5rem 0',
            fontWeight: '500'
          }}>
            No gallery posts yet
          </h3>
          <p style={{
            color: '#6c757d',
            margin: '0',
            fontSize: '0.9rem'
          }}>
            This component is working! If you can see this, the Gallery Management page is rendering correctly.
          </p>
        </div>
      </div>
      
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1000
      }}>
        <button
          onClick={() => alert('Add New Post button clicked!')}
          style={{
            background: 'white',
            color: '#212c59',
            border: '2px solid #212c59',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(33, 44, 89, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          + Add New Post
        </button>
      </div>
    </div>
  );
};

export default GalleryManagement;