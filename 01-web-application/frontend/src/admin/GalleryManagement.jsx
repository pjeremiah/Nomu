import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash, FaImages, FaVideo, FaPlay, FaTimes, FaStar, FaRegStar } from 'react-icons/fa';
import { Grid3X3 } from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

const GalleryManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const { showLogoutConfirm } = useModalContext();

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
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

  // Fetch posts
  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/gallery/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.data || []);
    } catch (err) {
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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
    <div className="container-fluid">
      <PageHeader 
        title="Gallery Management" 
        icon={Grid3X3}
        description="Create and manage gallery posts with images and videos"
      />

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Add Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0">Gallery Posts ({posts.length})</h5>
          <small className="text-muted">Manage your gallery content</small>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
        >
          <FaPlus className="me-2" />
          Add New Post
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading gallery posts...</p>
        </div>
      )}

      {/* Posts Grid */}
      {!loading && (
        <div className="row">
          {posts.length === 0 ? (
            <div className="col-12">
              <div className="text-center py-5">
                <FaImages size={48} className="text-muted mb-3" />
                <h5 className="text-muted">No gallery posts yet</h5>
                <p className="text-muted">Create your first gallery post to get started</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm();
                    setShowAdd(true);
                  }}
                >
                  <FaPlus className="me-2" />
                  Add First Post
                </button>
              </div>
            </div>
          ) : (
            posts.map((post, index) => (
              <div key={post._id} className="col-lg-4 col-md-6 mb-4">
                <div className="card h-100 shadow-sm">
                  {/* Post Media */}
                  <div className="position-relative" style={{ height: '200px', overflow: 'hidden' }}>
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
                          <div className="position-absolute top-0 end-0 m-2">
                            <span className="badge bg-dark">
                              +{post.media.length - 1} more
                            </span>
                          </div>
                        )}
                        <div className="position-absolute top-0 start-0 m-2">
                          <button
                            className={`btn btn-sm ${post.featured ? 'btn-warning' : 'btn-outline-warning'}`}
                            onClick={() => toggleFeatured(post._id, post.featured)}
                            title={post.featured ? 'Remove from featured' : 'Mark as featured'}
                          >
                            <FaStar size={12} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100 bg-light">
                        <FaImages size={48} className="text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="card-body">
                    <h6 className="card-title">{post.title}</h6>
                    <p className="card-text text-muted small">
                      {post.description || 'No description'}
                    </p>
                    {post.tags && post.tags.length > 0 && (
                      <div className="mb-2">
                        {post.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="badge bg-secondary me-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </small>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-primary"
                          onClick={() => {
                            setSelectedPost(post);
                            setShowView(true);
                          }}
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => {
                            setSelectedPost(post);
                            setShowDelete(true);
                          }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

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
            <div className="alert alert-danger" role="alert">
              {modalError}
            </div>
          )}

          <div className="mb-3">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-control"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Enter post title"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="Enter post description"
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Tags</label>
            <input
              type="text"
              className="form-control"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="Enter tags separated by commas"
            />
            <div className="form-text">Separate multiple tags with commas</div>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
              />
              <label className="form-check-label">
                Featured Post
              </label>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Media Files * (Max 5 files)</label>
            <input
              type="file"
              className="form-control"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            <div className="form-text">Select up to 5 images or videos</div>
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Selected Media:</label>
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
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                        onClick={() => removeMedia(index)}
                      >
                        <FaTimes />
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
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
              <h6>Description:</h6>
              <p>{selectedPost.description || 'No description'}</p>
            </div>

            {selectedPost.tags && selectedPost.tags.length > 0 && (
              <div className="mb-3">
                <h6>Tags:</h6>
                {selectedPost.tags.map((tag, index) => (
                  <span key={index} className="badge bg-secondary me-1">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-3">
              <h6>Media ({selectedPost.media?.length || 0} files):</h6>
              <div className="row">
                {selectedPost.media?.map((media, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    {media.type === 'video' ? (
                      <video
                        src={media.url}
                        className="img-fluid rounded"
                        controls
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={`Media ${index + 1}`}
                        className="img-fluid rounded"
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Created: {new Date(selectedPost.createdAt).toLocaleString()}
              </small>
              <div>
                <span className={`badge ${selectedPost.featured ? 'bg-warning' : 'bg-secondary'}`}>
                  {selectedPost.featured ? 'Featured' : 'Regular'}
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
            <p>Are you sure you want to delete this gallery post?</p>
            <div className="alert alert-warning">
              <strong>"{selectedPost.title}"</strong>
            </div>
            <p className="text-muted">This action cannot be undone.</p>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDelete(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeletePost}
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