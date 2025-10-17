import React, { useState, useEffect } from 'react';
import { FaTrash, FaPlus, FaEye, FaImages, FaTimes, FaStar } from 'react-icons/fa';
import { Grid3X3 } from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
// Gallery Management - Updated for deployment

const GalleryManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const { showLogoutConfirm } = useModalContext();

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
      setPosts(data.data || []);
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

      <div className="search-filter-container" style={{
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
        <div className="form-error" style={{ 
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

      {loading && <div className="p-3">Loading...</div>}

      <div className="menu-grid">
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
          posts.map((post, index) => (
            <div key={post._id} className="menu-item">
              <div className="menu-item-image">
                {post.media && post.media.length > 0 ? (
                  <>
                    {post.media[0].type === 'video' ? (
                      <video
                        src={post.media[0].url}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                        muted
                      />
                    ) : (
                      <img
                        src={post.media[0].url}
                        alt={post.title}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
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
                    <div className="menu-item-actions">
                      <button
                        className={`action-icon ${post.featured ? 'featured' : ''}`}
                        onClick={() => toggleFeatured(post._id, post.featured)}
                        title={post.featured ? 'Remove from featured' : 'Mark as featured'}
                        style={{
                          background: post.featured ? '#ffc107' : 'rgba(255,255,255,0.9)',
                          color: post.featured ? '#000' : '#212c59'
                        }}
                      >
                        <FaStar size={12} />
                      </button>
                      <button
                        className="action-icon view"
                        onClick={() => {
                          setSelectedPost(post);
                          setShowView(true);
                        }}
                        title="View Post"
                      >
                        <FaEye />
                      </button>
                      <button
                        className="action-icon delete"
                        onClick={() => {
                          setSelectedPost(post);
                          setShowDelete(true);
                        }}
                        title="Delete Post"
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

              <div className="menu-item-details">
                <h3>{post.title}</h3>
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
                <div className="menu-item-meta">
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
          ))
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
          className="add-item-btn"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
        >
          <FaPlus /> Add New Post
        </button>
      </div>

      {/* Add Post Modal */}
      <ResponsiveModal
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
            <div className="form-error" style={{ 
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

          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: '600', color: '#212c59' }}>Title *</label>
            <input
              type="text"
              className="form-control"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Enter post title"
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: '600', color: '#212c59' }}>Description</label>
            <textarea
              className="form-control"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Enter post description"
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: '600', color: '#212c59' }}>Tags</label>
            <input
              type="text"
              className="form-control"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="Enter tags separated by commas"
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            />
            <div className="form-text" style={{ fontSize: '12px', color: '#6c757d' }}>Separate multiple tags with commas</div>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                style={{ transform: 'scale(1.2)' }}
              />
              <label className="form-check-label" style={{ fontWeight: '600', color: '#212c59', marginLeft: '8px' }}>
                Featured Post
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: '600', color: '#212c59' }}>Media Files * (Max 5 files)</label>
            <input
              type="file"
              className="form-control"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            />
            <div className="form-text" style={{ fontSize: '12px', color: '#6c757d' }}>Select up to 5 images or videos</div>
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div className="mb-3">
              <label className="form-label" style={{ fontWeight: '600', color: '#212c59' }}>Selected Media:</label>
              <div className="row">
                {formData.media.map((media, index) => (
                  <div key={index} className="col-md-4 mb-2">
                    <div className="position-relative">
                      {media.type === 'video' ? (
                        <video
                          src={media.preview}
                          className="img-fluid rounded"
                          style={{ height: '100px', objectFit: 'cover', width: '100%' }}
                          muted
                        />
                      ) : (
                        <img
                          src={media.preview}
                          alt={`Preview ${index + 1}`}
                          className="img-fluid rounded"
                          style={{ height: '100px', objectFit: 'cover', width: '100%' }}
                        />
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute"
                        onClick={() => removeMedia(index)}
                        style={{
                          top: '5px',
                          right: '5px',
                          width: '24px',
                          height: '24px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FaTimes size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowAdd(false);
                resetForm();
              }}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif"
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                fontFamily: "'Montserrat', sans-serif",
                background: '#212c59',
                border: '2px solid #212c59'
              }}
            >
              Create Post
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* View Post Modal */}
      <ResponsiveModal
        show={showView}
        onHide={() => setShowView(false)}
        title={selectedPost?.title || 'Gallery Post'}
        size="large"
      >
        {selectedPost && (
          <div>
            <div className="mb-3">
              <h6 style={{ fontWeight: '600', color: '#212c59', marginBottom: '8px' }}>Description:</h6>
              <p style={{ color: '#495057', lineHeight: '1.5' }}>{selectedPost.description || 'No description'}</p>
            </div>

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="mb-3">
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

            <div className="mb-3">
              <h6 style={{ fontWeight: '600', color: '#212c59', marginBottom: '8px' }}>Media ({selectedPost.media?.length || 0} files):</h6>
              <div className="row">
                {selectedPost.media?.map((media, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    {media.type === 'video' ? (
                      <video
                        src={media.url}
                        className="img-fluid rounded"
                        controls
                        style={{ width: '100%', borderRadius: '8px' }}
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={`Media ${index + 1}`}
                        className="img-fluid rounded"
                        style={{ width: '100%', borderRadius: '8px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center">
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
      </ResponsiveModal>

      {/* Delete Confirmation Modal */}
      <ResponsiveModal
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
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDelete(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  fontFamily: "'Montserrat', sans-serif"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeletePost}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  fontFamily: "'Montserrat', sans-serif"
                }}
              >
                <FaTrash className="me-2" />
                Delete Post
              </button>
            </div>
          </div>
        )}
      </ResponsiveModal>
    </div>
  );
};

export default GalleryManagement;