import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaEye, FaImages, FaTimes, FaStar } from 'react-icons/fa';
import { Grid3X3 } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

const GalleryManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    featured: false,
    media: []
  });

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    if (showAdd || showDelete || showView) {
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
  }, [showAdd, showDelete, showView]);

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/gallery/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // Token is invalid or expired
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch posts`);
      }

      const data = await response.json();
      setPosts(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('Error fetching gallery posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setModalError('Maximum 5 files allowed');
      return;
    }

    const newMedia = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image'
    }));

    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
    }));
  };

  // Remove media item
  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  // Handle add post
  const handleAddPost = async (e) => {
    e.preventDefault();
    setModalError('');

    if (formData.media.length === 0) {
      setModalError('Please select at least one media file');
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('tags', formData.tags);
      formDataToSend.append('featured', formData.featured);

      formData.media.forEach((media, index) => {
        formDataToSend.append('media', media.file);
      });

      const response = await fetch(`${API_BASE}/api/gallery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      setShowAdd(false);
      setFormData({ title: '', description: '', tags: '', featured: false, media: [] });
      fetchPosts();
    } catch (err) {
      setModalError(err.message);
    }
  };

  // Handle delete post
  const handleDeletePost = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/gallery/${selectedPost._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete post');
      }

      setShowDelete(false);
      setSelectedPost(null);
      fetchPosts();
    } catch (err) {
      setModalError(err.message);
    }
  };

  // Toggle featured status
  const toggleFeatured = async (postId, currentStatus) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/gallery/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ featured: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({ title: '', description: '', tags: '', featured: false, media: [] });
    setModalError('');
  };

  // Simple PageHeader component
  const PageHeader = ({ title, icon: Icon }) => (
    <div style={{
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '45px',
        height: '45px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #003466 0%, #174385 100%)',
        color: 'white',
        fontSize: '1.2rem',
        boxShadow: '0 2px 10px rgba(0, 52, 102, 0.2)'
      }}>
        <Icon />
      </div>
      <div>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#212c59',
          margin: '0',
          fontFamily: "'Montserrat', sans-serif"
        }}>
          {title}
        </h1>
      </div>
    </div>
  );

  // Simple Modal component
  const SimpleModal = ({ show, onHide, title, children, size = 'medium' }) => {
    if (!show) return null;

    const getModalSize = () => {
      switch (size) {
        case 'small': return { maxWidth: '500px', width: '90vw' };
        case 'large': return { maxWidth: '800px', width: '95vw' };
        case 'extra-large': return { maxWidth: '1000px', width: '98vw' };
        default: return { maxWidth: '600px', width: '90vw' };
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
          padding: '20px',
          boxSizing: 'border-box',
          overflow: 'auto'
        }}
        onClick={onHide}
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            width: modalSize.width,
            maxWidth: modalSize.maxWidth,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Modal Header */}
          <div style={{ 
            padding: '1.5rem 2rem',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
            borderRadius: '20px 20px 0 0',
            borderBottom: '2px solid rgba(33, 44, 89, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
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
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Modal Content */}
          <div style={{
            padding: '1.5rem 2rem',
            flex: 1,
            overflowY: 'auto',
            minHeight: 0
          }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      padding: '2rem',
      fontFamily: "'Montserrat', sans-serif",
      color: '#212c59',
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      {/* Page Header */}
      <PageHeader 
        title="Gallery Management" 
        icon={Grid3X3}
      />

      <div style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '0',
            flexWrap: 'nowrap',
            flex: '0 0 auto'
          }}>
            <h5 style={{ margin: 0, color: '#212c59', fontWeight: '600' }}>
              Gallery Posts ({posts.length})
            </h5>
          </div>
          <div style={{ flex: '1' }}></div>
        </div>
      </div>

      {error && (
        <div style={{ 
          marginBottom: 12,
          color: '#dc3545',
          background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
          padding: '10px 14px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '13px',
          lineHeight: '1.4',
          fontFamily: "'Montserrat', sans-serif",
          border: '1px solid #f5c6cb',
          boxShadow: '0 2px 8px rgba(220, 53, 69, 0.1)'
        }}>{error}</div>
      )}

      {loading && <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {!loading && posts.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '2rem',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '2px dashed #e9ecef'
          }}>
            <h5 style={{ color: '#6c757d', margin: 0, fontWeight: '500' }}>No gallery posts</h5>
          </div>
        ) : (
          Array.isArray(posts) ? posts.map((post, index) => (
            <div key={post._id} style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}>
              <div style={{
                position: 'relative',
                height: '200px',
                overflow: 'hidden'
              }}>
                {post.media && post.media.length > 0 ? (
                  <>
                    {post.media[0].type === 'video' ? (
                      <video
                        src={post.media[0].url}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                      />
                    ) : (
                      <img
                        src={post.media[0].url}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {post.media.length > 1 && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        +{post.media.length - 1}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        onClick={() => toggleFeatured(post._id, post.featured)}
                        title={post.featured ? 'Remove from featured' : 'Mark as featured'}
                        style={{
                          background: post.featured ? '#ffc107' : 'rgba(255,255,255,0.9)',
                          color: post.featured ? '#000' : '#212c59',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <FaStar size={12} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPost(post);
                          setShowView(true);
                        }}
                        title="View Post"
                        style={{
                          background: 'rgba(255,255,255,0.9)',
                          color: '#212c59',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPost(post);
                          setShowDelete(true);
                        }}
                        title="Delete Post"
                        style={{
                          background: 'rgba(255,255,255,0.9)',
                          color: '#dc3545',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    background: '#f8f9fa'
                  }}>
                    <FaImages size={48} style={{ color: '#6c757d' }} />
                  </div>
                )}
              </div>

              <div style={{
                padding: '15px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '120px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#212c59',
                    margin: '0 0 12px 0',
                    fontFamily: "'Montserrat', sans-serif"
                  }}>
                    {post.title}
                  </h3>
                  <p style={{
                    color: '#6c757d',
                    fontSize: '14px',
                    margin: '0 0 12px 0',
                    lineHeight: '1.4'
                  }}>
                    {post.description || 'No description'}
                  </p>
                  {post.tags && post.tags.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      {post.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} style={{
                          display: 'inline-block',
                          background: '#e9ecef',
                          color: '#495057',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          marginRight: '4px',
                          marginBottom: '4px'
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  <small style={{ color: '#6c757d' }}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </small>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {post.featured && (
                      <span style={{
                        background: '#ffc107',
                        color: '#000',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        FEATURED
                      </span>
                    )}
                    <span style={{
                      background: post.media?.length > 0 ? '#28a745' : '#6c757d',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {post.media?.length || 0} MEDIA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )) : null
        )}
      </div>

      {/* Add New Post Button - Bottom Right */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1000
      }}>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
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
          onMouseEnter={(e) => {
            e.target.style.background = '#212c59';
            e.target.style.color = 'white';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 25px rgba(33, 44, 89, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#212c59';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(33, 44, 89, 0.3)';
          }}
        >
          <FaPlus /> Add New Post
        </button>
      </div>

      {/* Add Post Modal */}
      <SimpleModal
        show={showAdd}
        onHide={() => {
          setShowAdd(false);
          resetForm();
        }}
        title="Add New Gallery Post"
        size="large"
      >
        <form onSubmit={handleAddPost}>
          {modalError && (
            <div style={{ 
              marginBottom: 12,
              color: '#dc3545',
              background: 'linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%)',
              padding: '10px 14px',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '13px',
              lineHeight: '1.4',
              fontFamily: "'Montserrat', sans-serif",
              border: '1px solid #f5c6cb',
              boxShadow: '0 2px 8px rgba(220, 53, 69, 0.1)'
            }}>{modalError}</div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: '600', color: '#212c59', display: 'block', marginBottom: '0.5rem' }}>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Enter post title"
              style={{
                width: '100%',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: '600', color: '#212c59', display: 'block', marginBottom: '0.5rem' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Enter post description"
              style={{
                width: '100%',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: '600', color: '#212c59', display: 'block', marginBottom: '0.5rem' }}>Tags</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="Enter tags separated by commas"
              style={{
                width: '100%',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '0.25rem' }}>Separate multiple tags with commas</div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: '600', color: '#212c59' }}>Featured Post</span>
            </label>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontWeight: '600', color: '#212c59', display: 'block', marginBottom: '0.5rem' }}>Media Files * (Max 5 files)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{
                width: '100%',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '0.25rem' }}>Select up to 5 images or videos</div>
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: '600', color: '#212c59', display: 'block', marginBottom: '0.5rem' }}>Selected Media:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {formData.media.map((media, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    {media.type === 'video' ? (
                      <video
                        src={media.preview}
                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                        muted
                      />
                    ) : (
                      <img
                        src={media.preview}
                        alt={`Preview ${index + 1}`}
                        style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                resetForm();
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                background: '#6c757d',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                background: '#212c59',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Create Post
            </button>
          </div>
        </form>
      </SimpleModal>

      {/* View Post Modal */}
      <SimpleModal
        show={showView}
        onHide={() => setShowView(false)}
        title={selectedPost?.title || 'Gallery Post'}
        size="large"
      >
        {selectedPost && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <h6 style={{ fontWeight: '600', color: '#212c59', marginBottom: '8px' }}>Description:</h6>
              <p style={{ color: '#495057', lineHeight: '1.5' }}>{selectedPost.description || 'No description'}</p>
            </div>

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h6 style={{ fontWeight: '600', color: '#212c59', marginBottom: '8px' }}>Tags:</h6>
                {selectedPost.tags.map((tag, index) => (
                  <span key={index} style={{
                    display: 'inline-block',
                    background: '#e9ecef',
                    color: '#495057',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    marginRight: '8px',
                    marginBottom: '4px'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <h6 style={{ fontWeight: '600', color: '#212c59', marginBottom: '8px' }}>Media ({selectedPost.media?.length || 0} files):</h6>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {selectedPost.media?.map((media, index) => (
                  <div key={index}>
                    {media.type === 'video' ? (
                      <video
                        src={media.url}
                        controls
                        style={{ width: '100%', borderRadius: '8px' }}
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={`Media ${index + 1}`}
                        style={{ width: '100%', borderRadius: '8px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#6c757d' }}>
                Created: {new Date(selectedPost.createdAt).toLocaleString()}
              </small>
              <div>
                <span style={{
                  background: selectedPost.featured ? '#ffc107' : '#6c757d',
                  color: selectedPost.featured ? '#000' : 'white',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {selectedPost.featured ? 'FEATURED' : 'REGULAR'}
                </span>
              </div>
            </div>
          </div>
        )}
      </SimpleModal>

      {/* Delete Confirmation Modal */}
      <SimpleModal
        show={showDelete}
        onHide={() => setShowDelete(false)}
        title="Delete Gallery Post"
        size="small"
      >
        {selectedPost && (
          <div>
            <p style={{ color: '#495057', marginBottom: '16px' }}>Are you sure you want to delete this gallery post?</p>
            <div style={{
              background: '#f8f9fa',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e9ecef',
              marginBottom: '16px'
            }}>
              <strong style={{ color: '#212c59' }}>"{selectedPost.title}"</strong>
            </div>
            <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '20px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowDelete(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  fontFamily: "'Montserrat', sans-serif",
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  fontFamily: "'Montserrat', sans-serif",
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <FaTrash /> Delete Post
              </button>
            </div>
          </div>
        )}
      </SimpleModal>
    </div>
  );
};

export default GalleryManagement;