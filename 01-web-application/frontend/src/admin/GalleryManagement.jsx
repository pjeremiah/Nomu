import React, { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash, FaImages, FaVideo, FaPlay, FaTimes, FaArrowUp, FaArrowDown, FaStar, FaRegStar } from 'react-icons/fa';
import { Image, Video, Upload, Grid3X3 } from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';
import './GalleryManagement.css';

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

  // Form states
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    tags: '',
    featured: false,
    order: 0,
    media: []
  });
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    description: '',
    tags: '',
    featured: false,
    order: 0,
    media: []
  });
  const [deleteId, setDeleteId] = useState('');
  const [viewPost, setViewPost] = useState(null);

  // File upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Prevent body scrolling when modals are open
  useEffect(() => {
    if (showAdd || showEdit || showDelete || showView) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [showAdd, showEdit, showDelete, showView]);

  useEffect(() => {
    fetchPosts();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: statusFilter
      });

      const response = await fetch(`${API_BASE}/api/gallery/admin?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch gallery posts');
      }

      const data = await response.json();
      setPosts(data.data.posts);
      setTotalPages(data.data.pagination.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return [];

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('media', file);
      });

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/gallery/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const data = await response.json();
      return data.data.media;
    } catch (err) {
      setModalError(err.message);
      return [];
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddPost = async (e) => {
    e.preventDefault();
    setModalError('');

    if (addForm.media.length === 0) {
      setModalError('Please select at least one media file');
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('title', addForm.title);
      formData.append('description', addForm.description);
      formData.append('tags', addForm.tags);
      formData.append('featured', addForm.featured);
      formData.append('order', addForm.order);

      // Add media files
      addForm.media.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch(`${API_BASE}/api/gallery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create gallery post');
      }

      setShowAdd(false);
      setAddForm({ title: '', description: '', tags: '', featured: false, order: 0, media: [] });
      fetchPosts();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleEditPost = async (e) => {
    e.preventDefault();
    setModalError('');

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      formData.append('tags', editForm.tags);
      formData.append('featured', editForm.featured);
      formData.append('order', editForm.order);
      formData.append('isActive', 'true');

      // Add media files if any
      editForm.media.forEach(file => {
        formData.append('media', file);
      });

      const response = await fetch(`${API_BASE}/api/gallery/${editForm.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update gallery post');
      }

      setShowEdit(false);
      setEditForm({ id: '', title: '', description: '', tags: '', featured: false, order: 0, media: [] });
      fetchPosts();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleDeletePost = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/gallery/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete gallery post');
      }

      setShowDelete(false);
      setDeleteId('');
      fetchPosts();
    } catch (err) {
      setModalError(err.message);
    }
  };

  const handleToggleStatus = async (postId, currentStatus) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/gallery/${postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update post status');
      }

      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (post) => {
    setEditForm({
      id: post._id,
      title: post.title,
      description: post.description || '',
      tags: post.tags ? post.tags.join(', ') : '',
      featured: post.featured,
      order: post.order,
      media: []
    });
    setShowEdit(true);
  };

  const openViewModal = (post) => {
    setViewPost(post);
    setShowView(true);
  };

  const openDeleteModal = (postId) => {
    setDeleteId(postId);
    setShowDelete(true);
  };

  const handleFileChange = (e, formType) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      setModalError('Maximum 5 files allowed per post');
      return;
    }

    if (formType === 'add') {
      setAddForm(prev => ({ ...prev, media: files }));
    } else {
      setEditForm(prev => ({ ...prev, media: files }));
    }
  };

  const removeFile = (index, formType) => {
    if (formType === 'add') {
      setAddForm(prev => ({
        ...prev,
        media: prev.media.filter((_, i) => i !== index)
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        media: prev.media.filter((_, i) => i !== index)
      }));
    }
  };

  const getMediaIcon = (mediaType) => {
    return mediaType === 'video' ? <FaVideo className="text-blue-500" /> : <FaImages className="text-green-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="gallery-management">
      <PageHeader 
        title="Gallery Management" 
        subtitle="Manage your gallery posts and media content"
        icon={<Grid3X3 size={24} />}
      />

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-outline-secondary" type="button">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Posts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="col-md-3 text-end">
          <button
            className="btn btn-primary add-item-btn"
            onClick={() => setShowAdd(true)}
          >
            <FaPlus className="me-2" />
            Add New Post
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          {posts.map((post) => (
            <div key={post._id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100 gallery-post-card">
                <div className="position-relative">
                  {/* Primary Media Display */}
                  <div className="gallery-media-container">
                    {post.media[0]?.type === 'video' ? (
                      <video className="card-img-top gallery-media" controls>
                        <source src={`${API_BASE}${post.media[0].url}`} type={post.media[0].mimetype} />
                      </video>
                    ) : (
                      <img 
                        src={`${API_BASE}${post.media[0].url}`} 
                        className="card-img-top gallery-media" 
                        alt={post.title}
                      />
                    )}
                    
                    {/* Media Count Badge */}
                    {post.media.length > 1 && (
                      <div className="media-count-badge">
                        <FaImages className="me-1" />
                        {post.media.length}
                      </div>
                    )}

                    {/* Featured Badge */}
                    {post.featured && (
                      <div className="featured-badge">
                        <FaStar />
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className={`status-badge ${post.isActive ? 'active' : 'inactive'}`}>
                      {post.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  {/* Action Buttons Overlay */}
                  <div className="action-buttons-overlay">
                    <button
                      className="btn btn-sm btn-light me-1"
                      onClick={() => openViewModal(post)}
                      title="View Post"
                    >
                      <FaEye />
                    </button>
                    <button
                      className="btn btn-sm btn-warning me-1"
                      onClick={() => openEditModal(post)}
                      title="Edit Post"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => openDeleteModal(post._id)}
                      title="Delete Post"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <h6 className="card-title">{post.title}</h6>
                  <p className="card-text text-muted small">
                    {post.description || 'No description'}
                  </p>
                  
                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="mb-2">
                      {post.tags.map((tag, index) => (
                        <span key={index} className="badge bg-secondary me-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Media Info */}
                  <div className="d-flex justify-content-between align-items-center text-muted small">
                    <span>
                      {post.media.length} {post.media.length === 1 ? 'item' : 'items'}
                    </span>
                    <span>Order: {post.order}</span>
                  </div>
                </div>

                <div className="card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      className={`btn btn-sm ${post.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      onClick={() => handleToggleStatus(post._id, post.isActive)}
                    >
                      {post.isActive ? <FaEyeSlash /> : <FaEye />}
                      {post.isActive ? 'Hide' : 'Show'}
                    </button>
                    <small className="text-muted">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
            </li>
            {[...Array(totalPages)].map((_, i) => (
              <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Add Post Modal */}
      <ResponsiveModal
        show={showAdd}
        onHide={() => setShowAdd(false)}
        title="Add New Gallery Post"
        size="lg"
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
              value={addForm.title}
              onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
              required
              maxLength={100}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={addForm.description}
              onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="form-control"
              value={addForm.tags}
              onChange={(e) => setAddForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="food, drinks, cafe, etc."
            />
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                className="form-control"
                value={addForm.order}
                onChange={(e) => setAddForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div className="col-md-6">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={addForm.featured}
                  onChange={(e) => setAddForm(prev => ({ ...prev, featured: e.target.checked }))}
                />
                <label className="form-check-label">
                  Featured Post
                </label>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Media Files * (Max 5 files)</label>
            <input
              type="file"
              className="form-control"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFileChange(e, 'add')}
              required
            />
            <div className="form-text">
              Supported formats: Images (JPEG, PNG, GIF, WebP) and Videos (MP4, AVI, MOV, WebM)
            </div>
          </div>

          {/* Selected Files Preview */}
          {addForm.media.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Selected Files:</label>
              <div className="selected-files">
                {addForm.media.map((file, index) => (
                  <div key={index} className="selected-file-item">
                    <div className="d-flex align-items-center">
                      {getMediaIcon(file.type?.startsWith('video/') ? 'video' : 'image')}
                      <div className="ms-2 flex-grow-1">
                        <div className="fw-bold">{file.name}</div>
                        <small className="text-muted">{formatFileSize(file.size)}</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeFile(index, 'add')}
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
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Edit Post Modal */}
      <ResponsiveModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        title="Edit Gallery Post"
        size="lg"
      >
        <form onSubmit={handleEditPost}>
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
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              required
              maxLength={100}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              maxLength={500}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="form-control"
              value={editForm.tags}
              onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="food, drinks, cafe, etc."
            />
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label">Display Order</label>
              <input
                type="number"
                className="form-control"
                value={editForm.order}
                onChange={(e) => setEditForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div className="col-md-6">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={editForm.featured}
                  onChange={(e) => setEditForm(prev => ({ ...prev, featured: e.target.checked }))}
                />
                <label className="form-check-label">
                  Featured Post
                </label>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">New Media Files (optional, max 5 files)</label>
            <input
              type="file"
              className="form-control"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFileChange(e, 'edit')}
            />
            <div className="form-text">
              Leave empty to keep existing media. Uploading new files will replace existing ones.
            </div>
          </div>

          {/* Selected Files Preview */}
          {editForm.media.length > 0 && (
            <div className="mb-3">
              <label className="form-label">New Files:</label>
              <div className="selected-files">
                {editForm.media.map((file, index) => (
                  <div key={index} className="selected-file-item">
                    <div className="d-flex align-items-center">
                      {getMediaIcon(file.type?.startsWith('video/') ? 'video' : 'image')}
                      <div className="ms-2 flex-grow-1">
                        <div className="fw-bold">{file.name}</div>
                        <small className="text-muted">{formatFileSize(file.size)}</small>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeFile(index, 'edit')}
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
              onClick={() => setShowEdit(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Updating...' : 'Update Post'}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* View Post Modal */}
      <ResponsiveModal
        show={showView}
        onHide={() => setShowView(false)}
        title={viewPost?.title || 'Gallery Post'}
        size="lg"
      >
        {viewPost && (
          <div>
            <div className="mb-3">
              <h6>Description:</h6>
              <p>{viewPost.description || 'No description provided'}</p>
            </div>

            {viewPost.tags && viewPost.tags.length > 0 && (
              <div className="mb-3">
                <h6>Tags:</h6>
                {viewPost.tags.map((tag, index) => (
                  <span key={index} className="badge bg-secondary me-1">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-3">
              <h6>Media ({viewPost.media.length} items):</h6>
              <div className="row">
                {viewPost.media.map((media, index) => (
                  <div key={index} className="col-md-6 mb-3">
                    <div className="card">
                      {media.type === 'video' ? (
                        <video className="card-img-top" controls>
                          <source src={`${API_BASE}${media.url}`} type={media.mimetype} />
                        </video>
                      ) : (
                        <img 
                          src={`${API_BASE}${media.url}`} 
                          className="card-img-top" 
                          alt={`Media ${index + 1}`}
                        />
                      )}
                      <div className="card-body p-2">
                        <small className="text-muted">
                          {media.originalName} ({formatFileSize(media.size)})
                        </small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="d-flex justify-content-between">
              <div>
                <strong>Status:</strong> {viewPost.isActive ? 'Active' : 'Inactive'}<br />
                <strong>Featured:</strong> {viewPost.featured ? 'Yes' : 'No'}<br />
                <strong>Order:</strong> {viewPost.order}
              </div>
              <div className="text-end">
                <small className="text-muted">
                  Created: {new Date(viewPost.createdAt).toLocaleDateString()}<br />
                  Updated: {new Date(viewPost.updatedAt).toLocaleDateString()}
                </small>
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
        size="sm"
      >
        <div>
          <p>Are you sure you want to delete this gallery post? This action cannot be undone.</p>
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
              Delete
            </button>
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
};

export default GalleryManagement;
