import React, { useState, useEffect, useCallback } from 'react';
import { FaTrash, FaPlus, FaEye, FaImages, FaTimes, FaStar, FaEdit, FaInstagram, FaHeart, FaComment, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Grid3X3 } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper to resolve media URL (handles absolute and relative)
const getMediaUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url}`;
};

  // Helper to format time ago (same as client-side)
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months}mo`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y`;
  }
};


// Responsive helpers
const getGridMinWidth = () => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  if (w <= 480) return 220;      // very small
  if (w <= 640) return 240;      // small tablets
  if (w <= 768) return 260;      // tablets
  if (w <= 1024) return 280;     // small laptop
  return 300;                    // desktop
};

const getCardMediaHeight = () => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  if (w <= 480) return 160;
  if (w <= 640) return 180;
  if (w <= 768) return 190;
  if (w <= 1024) return 200;
  return 220;
};

const getFabOffset = () => {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const base = w <= 480 ? 12 : w <= 768 ? 16 : 24;
  return { bottom: base * 1.5, right: base * 1.5 };
};

// Simple Modal component - moved outside to prevent recreation
const SimpleModal = ({ show, onHide, title, children, size = 'medium' }) => {
  if (!show) return null;

  const getModalSize = () => {
    // STANDARDIZED MODAL SIZING - Same as ResponsiveModal
    switch (size) {
      case 'small': return { maxWidth: '450px', width: '90%' };
      case 'large': return { maxWidth: '650px', width: '95%' };
      case 'extra-large': return { maxWidth: '750px', width: '98%' };
      default: return { maxWidth: '550px', width: '92%' };
    }
  };

  const modalSize = getModalSize();

  // Handle backdrop click - only close if clicking the backdrop itself
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onHide();
    }
  };

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
        padding: '15px', // STANDARDIZED PADDING
        boxSizing: 'border-box',
        overflow: 'auto'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#f8f9fa',
          borderRadius: '16px', // STANDARDIZED BORDER RADIUS
          border: '1px solid rgba(255, 255, 255, 0.2)',
          width: modalSize.width,
          maxWidth: modalSize.maxWidth,
          maxHeight: 'calc(100vh - 30px)', // STANDARDIZED HEIGHT
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(33, 44, 89, 0.3), 0 8px 25px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Modal Header */}
        <div style={{ 
          padding: '1.75rem 2.25rem', // STANDARDIZED PADDING
          borderRadius: '16px 16px 0 0', // STANDARDIZED BORDER RADIUS
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h3 style={{
            margin: 0,
            color: '#212c59',
            fontWeight: '700',
            fontSize: '1.25rem', // STANDARDIZED FONT SIZE
            fontFamily: "'Montserrat', sans-serif",
            textAlign: 'center' // CENTERED TEXT
          }}>
            {title}
          </h3>
        </div>

        {/* Modal Content */}
        <div style={{
          padding: '1.75rem 2.25rem', // STANDARDIZED PADDING
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          background: '#f8f9fa'
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const GalleryManagement = () => {
  const [posts, setPosts] = useState([]);
  
  // Add CSS animations for modal and video fullscreen styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      /* Hide fullscreen, download, and picture-in-picture controls */
      video::-webkit-media-controls-fullscreen-button {
        display: none !important;
      }
      
      video::-webkit-media-controls-picture-in-picture-button {
        display: none !important;
      }
      
      video::-webkit-media-controls-download-button {
        display: none !important;
      }
      
      /* For Firefox */
      video::-moz-media-controls-fullscreen-button {
        display: none !important;
      }
      
      /* Reverse volume slider - fill appears on right side of handle */
      video::-webkit-media-controls-volume-slider-container {
        direction: ltr;
      }
      
      video::-webkit-media-controls-volume-slider {
        direction: ltr;
        transform: scaleX(-1);
      }
      
      /* Flip the mute button back to normal */
      video::-webkit-media-controls-mute-button {
        transform: scaleX(-1);
      }
      
      /* Reverse the slider track fill direction */
      video::-webkit-media-controls-volume-slider::-webkit-slider-runnable-track {
        direction: rtl;
      }
      
      /* Disable right-click context menu options */
      video {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postLikes, setPostLikes] = useState({});
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    media: []
  });

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    if (showAdd || showEdit || showDelete || showView) {
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
  }, [showAdd, showEdit, showDelete, showView]);


  // Handle video fullscreen and picture-in-picture to maintain aspect ratio
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Use Fullscreen API to get the fullscreen element (not CSS selectors)
      const fullscreenElement = document.fullscreenElement || 
                                document.webkitFullscreenElement ||
                                document.mozFullScreenElement ||
                                document.msFullscreenElement;
      
      if (fullscreenElement) {
        let video = null;
        let container = null;
        
        // Check if the fullscreen element is the video itself
        if (fullscreenElement.tagName === 'VIDEO') {
          video = fullscreenElement;
          container = fullscreenElement;
        } else {
          // If it's a container, find the video inside
          video = fullscreenElement.querySelector('video');
          container = fullscreenElement;
        }
        
        if (video) {
          const isPortrait = video.videoHeight > video.videoWidth;
          
          // Small delay to ensure fullscreen is fully applied
          setTimeout(() => {
            // Style the fullscreen container
            if (container) {
              container.style.display = 'flex';
              container.style.alignItems = 'center';
              container.style.justifyContent = 'center';
              container.style.width = '100vw';
              container.style.height = '100vh';
              container.style.backgroundColor = '#000';
              container.style.margin = '0';
              container.style.padding = '0';
            }
            
            // Apply styles to maintain aspect ratio
            if (isPortrait) {
              video.style.objectFit = 'contain';
              video.style.width = 'auto';
              video.style.height = '100vh';
              video.style.maxWidth = '100vw';
              video.style.margin = '0';
              video.style.display = 'block';
            } else {
              video.style.objectFit = 'contain';
              video.style.width = '100vw';
              video.style.height = 'auto';
              video.style.maxHeight = '100vh';
              video.style.margin = '0';
              video.style.display = 'block';
            }
          }, 50);
        }
      } else {
        // Exiting fullscreen - reset styles if needed
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          if (video.classList.contains('video-portrait') || video.classList.contains('video-landscape')) {
            // Reset to default styles when exiting fullscreen
            video.style.width = '';
            video.style.height = '';
            video.style.maxWidth = '';
            video.style.maxHeight = '';
            video.style.margin = '';
          }
        });
      }
    };

    const handleEnterPictureInPicture = (e) => {
      const video = e.target;
      // Picture-in-picture maintains the video's natural aspect ratio automatically
      // The browser handles this, but we ensure object-fit is correct
      video.style.objectFit = 'contain';
    };

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Picture-in-picture events
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('enterpictureinpicture', handleEnterPictureInPicture);
    });

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      videos.forEach(video => {
        video.removeEventListener('enterpictureinpicture', handleEnterPictureInPicture);
      });
    };
  }, [showView, currentMediaIndex]);


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
      setPosts(Array.isArray(data.data?.posts) ? data.data.posts : []);
    } catch (err) {
      console.error('Error fetching gallery posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch likes for a post
  const fetchPostLikes = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/engagement/likes/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPostLikes(prev => ({
          ...prev,
          [postId]: data.totalLikes || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
    // trigger re-render on resize for responsive calculations
    const onResize = () => setPosts(prev => [...prev]);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Handle form input changes
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const currentMediaCount = formData.media.length;
    const maxFileSize = 100 * 1024 * 1024; // 100MB per file (increased for better video support)
    const maxFiles = 5;
    
    // Check file count limit
    if (currentMediaCount + files.length > maxFiles) {
      const allowedCount = Math.max(0, maxFiles - currentMediaCount);
      const limitedFiles = files.slice(0, allowedCount);
      if (limitedFiles.length === 0) {
        const existingCount = formData.media.filter(m => m.isExisting).length;
        const newCount = formData.media.filter(m => !m.isExisting).length;
        setModalError(`Maximum ${maxFiles} files allowed per post. You currently have ${existingCount} existing and ${newCount} new files (total: ${currentMediaCount}). Please remove some media first.`);
        e.target.value = '';
        return;
      }
      // Replace files with the limited subset and warn
      setModalError(`Only ${allowedCount} file(s) added to respect the ${maxFiles}-file limit.`);
      files.length = 0;
      Array.prototype.push.apply(files, limitedFiles);
    }

    // Validate file sizes
    const invalidFiles = [];
    const validFiles = [];
    
    files.forEach(file => {
      if (file.size > maxFileSize) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      const fileList = invalidFiles.join(', ');
      const maxSizeMB = maxFileSize / (1024 * 1024);
      setModalError(`The following file(s) exceed the ${maxSizeMB}MB limit: ${fileList}. Please select smaller files.`);
      // Remove invalid files from the input
      e.target.value = '';
      if (validFiles.length === 0) {
        return;
      }
    }

    // Only process valid files
    const filesToProcess = invalidFiles.length > 0 ? validFiles : files;

    const newMedia = filesToProcess.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('video/') ? 'video' : 'image',
      isExisting: false, // Mark as new media
      size: file.size // Store file size for display
    }));

    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...newMedia]
    }));

    // Clear error if files were successfully added
    if (invalidFiles.length === 0 && newMedia.length > 0) {
      setModalError('');
    }
  };

  // Remove media item
  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  // Handle edit post
  const handleEditPost = async (e) => {
    // Prevent multiple submissions
    if (isEditing) {
      return;
    }
    
    // Prevent default form submission
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    try {
      setModalError('');
      setIsEditing(true);

      // Validation - allow existing media or new media
      if (formData.media.length === 0) {
        setModalError('Please keep at least one media file or upload new ones');
        setIsEditing(false);
        return;
      }

      if (!formData.title.trim()) {
        setModalError('Please enter a title');
        setIsEditing(false);
        return;
      }

      // Validate total media count (existing kept + new) doesn't exceed 5
      const existingMediaCount = formData.media.filter(media => media.isExisting).length;
      const newMediaCount = formData.media.filter(media => !media.isExisting && media.file).length;
      const totalMediaCount = existingMediaCount + newMediaCount;
      
      if (totalMediaCount > 5) {
        setModalError(`Maximum 5 media files allowed per post. You have ${existingMediaCount} existing and are trying to add ${newMediaCount} new files (total: ${totalMediaCount}). Please remove some media first.`);
        setIsEditing(false);
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setModalError('Authentication required. Please log in again.');
        setIsEditing(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('tags', formData.tags.trim());

      // Send existing media IDs to keep (those that are still in formData.media and marked as existing)
      // Always send this array, even if empty, so backend knows which existing media to keep
      const existingMediaToKeep = formData.media
        .filter(media => media.isExisting && media.gridfsId)
        .map(media => {
          // Handle both string and ObjectId formats
          const id = media.gridfsId;
          if (!id) return null;
          // Convert to string, handling both ObjectId objects and strings
          return String(id);
        })
        .filter(id => id !== null && id !== 'undefined' && id !== ''); // Remove any invalid values
      
      // Debug log
      console.log('Sending keepMediaIds:', existingMediaToKeep, 'Existing media count:', formData.media.filter(m => m.isExisting).length);
      
      // Always append keepMediaIds (even if empty array) to tell backend which existing media to keep
      formDataToSend.append('keepMediaIds', JSON.stringify(existingMediaToKeep));

      // Only send new media files (not existing ones)
      const newMediaFiles = formData.media.filter(media => !media.isExisting && media.file);
      console.log('New media files to upload:', newMediaFiles.length, 'files');
      
      // Validate files before sending
      for (let i = 0; i < newMediaFiles.length; i++) {
        const media = newMediaFiles[i];
        console.log(`File ${i + 1}:`, {
          name: media.file?.name,
          type: media.file?.type,
          size: media.file?.size,
          hasFile: !!media.file,
          fileKeys: media.file ? Object.keys(media.file) : 'no file'
        });
        
        if (!media.file) {
          console.error('Media item has no file object:', media);
          setModalError(`File ${i + 1} is invalid. Please select the file again.`);
          setIsEditing(false);
          return;
        }
        
        if (!(media.file instanceof File) && !(media.file instanceof Blob)) {
          console.error('Media file is not a File or Blob:', media.file);
          setModalError(`File ${i + 1} is not a valid file. Please select the file again.`);
          setIsEditing(false);
          return;
        }
        
        formDataToSend.append('media', media.file);
      }
      
      if (newMediaFiles.length === 0 && existingMediaToKeep.length === 0) {
        setModalError('Please keep at least one existing media or upload new files');
        setIsEditing(false);
        return;
      }

      console.log('Sending update request with:', {
        keepMediaIds: existingMediaToKeep.length,
        newFiles: newMediaFiles.length,
        postId: selectedPost._id
      });

      const response = await fetch(`${API_BASE}/api/gallery/${selectedPost._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update post');
      }

      // Success - show green notification
      setModalError('');
      
      // Show success message first
      setModalSuccess('Post updated successfully');
      
      // Keep button as "Updating..." for a moment, then close modal and reset
      // Total time: 2 seconds to show success message
      setTimeout(() => {
        setIsEditing(false);
        setShowEdit(false);
        setSelectedPost(null);
        setFormData({ title: '', description: '', tags: '', featured: false, media: [] });
        setModalSuccess('');
        fetchPosts();
      }, 2000);
    } catch (error) {
      console.error('Error in handleEditPost:', error);
      setModalError(error.message || 'An unexpected error occurred');
      setIsEditing(false);
    }
  };

  // Handle add post
  const handleAddPost = async (e) => {
    // Prevent multiple submissions
    if (isCreating) {
      return;
    }
    
    try {
      e.preventDefault();
      setModalError('');
      setIsCreating(true);
    } catch (error) {
      console.error('Error in handleAddPost start:', error);
      setModalError('Error processing form: ' + error.message);
      setIsCreating(false);
      return;
    }

    if (formData.media.length === 0) {
      setModalError('Please select at least one media file');
      setIsCreating(false);
      return;
    }

    if (!formData.title.trim()) {
      setModalError('Please enter a title');
      setIsCreating(false);
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setModalError('Authentication required. Please log in again.');
        setIsCreating(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('tags', formData.tags.trim());

      // Only append files that actually exist
      const filesToSend = [];
      formData.media.forEach((media, index) => {
        if (media.file) {
          filesToSend.push(media.file);
          formDataToSend.append('media', media.file);
        }
      });

      // Double-check that we have at least one file
      if (filesToSend.length === 0) {
        setModalError('Please select at least one valid media file');
        setIsCreating(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/gallery`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });
      
      let responseData;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType && contentType.includes('application/json')) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} ${response.statusText}. ${text.substring(0, 200)}`);
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorMessage = responseData.message || responseData.error || `Failed to create gallery post (${response.status})`;
        throw new Error(errorMessage);
      }

      // Success - show green notification
      setModalError('');
      
      // Show success message first
      setModalSuccess('Post created successfully');
      
      // Keep button as "Creating..." for a moment, then close modal and reset
      // Total time: 2 seconds to show success message (same as update)
      setTimeout(() => {
        setIsCreating(false);
        setShowAdd(false);
        setFormData({ title: '', description: '', tags: '', featured: false, media: [] });
        setModalSuccess('');
        fetchPosts();
      }, 2000);
    } catch (err) {
      console.error('Error creating post:', err);
      let errorMessage = 'Failed to create gallery post';
      if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      }
      setModalError(errorMessage);
      setIsCreating(false);
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
    setModalSuccess('');
    setIsCreating(false);
    setIsEditing(false);
  };

  // Open edit modal and populate form
  const openEditModal = (post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title || '',
      description: post.description || '',
      tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
      media: post.media ? post.media.map(media => {
        // Ensure gridfsId is preserved and accessible
        const mediaObj = {
          ...media,
          isExisting: true, // Mark as existing media
          preview: getMediaUrl(media.url) // Use absolute URL for preview
        };
        // Ensure gridfsId is available (might be _id or gridfsId)
        if (!mediaObj.gridfsId && media._id) {
          mediaObj.gridfsId = media._id;
        }
        // Debug log to verify gridfsId exists
        if (!mediaObj.gridfsId) {
          console.warn('Media item missing gridfsId:', media);
        }
        return mediaObj;
      }) : []
    });
    setModalError('');
    setModalSuccess('');
    setShowEdit(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setShowEdit(false);
    setSelectedPost(null);
    resetForm();
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
        gridTemplateColumns: `repeat(auto-fill, minmax(${getGridMinWidth()}px, 1fr))`,
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
                height: `${getCardMediaHeight()}px`,
                overflow: 'hidden'
              }}>
                {post.media && post.media.length > 0 ? (
                  <>
                    {post.media[0].type === 'video' ? (
                      <video
                        src={getMediaUrl(post.media[0].url)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        muted
                      />
                    ) : (
                      <img
                        src={getMediaUrl(post.media[0].url)}
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
                          // Fetch fresh post data to ensure we have the latest media
                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          if (token) {
                            fetch(`${API_BASE}/api/gallery/${post._id}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success && data.data) {
                                  setSelectedPost(data.data);
                                  setCurrentMediaIndex(0);
                                  setShowView(true);
                                  fetchPostLikes(post._id);
                                } else {
                                  // Fallback to cached post data
                                  setSelectedPost(post);
                                  setCurrentMediaIndex(0);
                                  setShowView(true);
                                  fetchPostLikes(post._id);
                                }
                              })
                              .catch(err => {
                                console.error('Error fetching post:', err);
                                // Fallback to cached post data
                                setSelectedPost(post);
                                setCurrentMediaIndex(0);
                                setShowView(true);
                                fetchPostLikes(post._id);
                              });
                          } else {
                            setSelectedPost(post);
                            setCurrentMediaIndex(0);
                            setShowView(true);
                            fetchPostLikes(post._id);
                          }
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
                        onClick={() => openEditModal(post)}
                        title="Edit Post"
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
                        <FaEdit />
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
        bottom: `${getFabOffset().bottom}px`,
        right: `${getFabOffset().right}px`,
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
            e.target.style.background = '#f8f9fa';
            e.target.style.color = '#212c59';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 20px rgba(33, 44, 89, 0.3)';
          }}
        >
          <FaPlus /> Add New Post
        </button>
      </div>

      {/* Add Post Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <style>
            {`
              .admin-modal .admin-btn-primary {
                background: white !important;
                color: #212c59 !important;
                border: 2px solid #212c59 !important;
                border-radius: 8px !important;
                padding: 8px 12px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1) !important;
                flex: 0 0 auto !important;
                min-width: 0 !important;
                max-width: none !important;
                font-size: 0.85rem !important;
                width: calc(50% - 40px) !important;
                box-sizing: border-box !important;
                margin: 0 !important;
              }
              .admin-modal .admin-btn-primary:hover {
                background: #212c59 !important;
                border-color: #212c59 !important;
                color: white !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3) !important;
              }
              .admin-modal .admin-btn-secondary {
                background: white !important;
                color: #b08d57 !important;
                border: 2px solid #b08d57 !important;
                border-radius: 8px !important;
                padding: 8px 12px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1) !important;
                flex: 0 0 auto !important;
                min-width: 0 !important;
                max-width: none !important;
                font-size: 0.85rem !important;
                width: calc(50% - 40px) !important;
                box-sizing: border-box !important;
                margin: 0 !important;
              }
              .admin-modal .admin-btn-secondary:hover {
                background: #f8f6f0 !important;
                border-color: #b08d57 !important;
                color: #b08d57 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
              }
              .admin-modal input,
              .admin-modal select,
              .admin-modal textarea,
              .admin-modal .enhanced-dropdown,
              .admin-modal .enhanced-dropdown .dropdown-button,
              .admin-modal .enhanced-dropdown .dropdown-button input,
              .admin-modal .form-control,
              .admin-modal .admin-form-input {
                background-color: #f8f9fa !important;
                height: 40px !important;
                min-height: 40px !important;
                max-height: 40px !important;
                padding: 8px 12px !important;
                font-size: 0.8rem !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
                line-height: 1.2 !important;
                vertical-align: middle !important;
              }
              .admin-modal .admin-form-actions {
                display: flex !important;
                gap: 12px !important;
                justify-content: center !important;
                margin-top: 4px !important;
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
                padding: 0 !important;
              }
            `}
          </style>
          <div className="admin-modal" style={{
            background: '#f8f9fa',
            borderRadius: '20px',
            padding: '12px 6px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid #e9ecef',
              background: '#f8f9fa',
              paddingTop: '8px',
              borderRadius: '20px 20px 0 0'
            }}>
              <h3 style={{margin: 0, color: '#212c59', fontWeight: '700', textAlign: 'center', fontSize: '1rem'}}>
                Add New Gallery Post
              </h3>
            </div>
            <form id="add-post-form" className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#f8f9fa', marginBottom: '0px', paddingBottom: '0px' }}
          onSubmit={(e) => {
            e.preventDefault();
            handleAddPost(e);
          }} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target.type !== 'textarea') {
              e.preventDefault();
              handleAddPost(e);
            }
          }}
        >
              {/* Error Display inside Add Modal */}
          {modalError && (
                <div className="error-message" style={{
                  background: '#ffebee',
                  border: '1px solid #f44336',
                  color: '#f44336',
                  padding: '4px 8px',
              borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>
                  <p style={{ margin: 0 }}>{modalError}</p>
                </div>
              )}
              
              {/* Success Display inside Add Modal */}
          {modalSuccess && (
                <div className="success-message" style={{
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  color: '#2e7d32',
                  padding: '4px 8px',
              borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  <p style={{ margin: 0 }}>{modalSuccess}</p>
                </div>
              )}

              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Title</label>
            <input
              key="title-input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Enter post title"
              autoComplete="off"
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                boxSizing: 'border-box',
                    width: '100%'
              }}
            />
          </div>

              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
                  rows="1"
              placeholder="Enter post description"
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                boxSizing: 'border-box',
                    width: '100%',
                    resize: 'none',
                    overflow: 'hidden'
              }}
            />
          </div>

              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Tags</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="Enter tags separated by commas"
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
          </div>


              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Media Files (Max 5 files)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
                <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                  <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Selected Media:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                {formData.media.map((media, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    {media.type === 'video' ? (
                      <video
                        src={media.preview}
                            style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                        muted
                      />
                    ) : (
                      <img
                        src={media.preview}
                        alt={`Preview ${index + 1}`}
                            style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      style={{
                        position: 'absolute',
                            top: '2px',
                            right: '2px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                            fontSize: '10px'
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
            </form>
            
            <div className="admin-form-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center', 
              marginTop: '0px',
              paddingTop: '0px',
              maxWidth: '100%',
              width: '100%',
              boxSizing: 'border-box'
            }}>
            <button
              type="button"
              onClick={() => {
                  // Dispatch event to close all dropdowns
                  document.dispatchEvent(new CustomEvent('modalClose'));
                setShowAdd(false);
                resetForm();
              }}
                className="admin-btn admin-btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              form="add-post-form"
              disabled={isCreating}
                className="admin-btn admin-btn-primary"
            >
              {isCreating ? 'Creating...' : 'Create Post'}
            </button>
          </div>
          </div>
        </div>
      )}

       {/* View Post Modal - Instagram Style */}
       {showView && (
         <div style={{
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           background: 'rgba(0, 0, 0, 0.9)',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           zIndex: 1000,
           animation: 'fadeIn 0.3s ease-out',
           padding: '20px',
           boxSizing: 'border-box'
         }}>
           <div style={{
             background: 'white',
                borderRadius: '8px',
             maxWidth: '90vw',
             maxHeight: '90vh',
             overflow: 'hidden',
             position: 'relative',
             display: 'flex',
             width: '100%',
             maxWidth: '1000px',
             height: '80vh'
           }} onClick={(e) => e.stopPropagation()}>
             {selectedPost && (
               <>
                 {/* Left Side - Media Section */}
                 <div style={{ 
                   flex: '1',
                   position: 'relative',
                   background: '#000',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   overflow: 'hidden'
                 }}>
                   {selectedPost.media && selectedPost.media.length > 0 ? (
                     <>
                       {selectedPost.media[currentMediaIndex].type === 'video' ? (
                         <video
                           key={currentMediaIndex}
                           src={getMediaUrl(selectedPost.media[currentMediaIndex].url)}
                           controls
                           controlsList="nodownload nofullscreen noremoteplayback"
                           disablePictureInPicture
                           onLoadedMetadata={(e) => {
                             const video = e.target;
                             const isPortrait = video.videoHeight > video.videoWidth;
                             video.classList.toggle('video-portrait', isPortrait);
                             video.classList.toggle('video-landscape', !isPortrait);
                           }}
                           onContextMenu={(e) => {
                             e.preventDefault();
                             return false;
                           }}
                           style={{ 
                             width: '100%', 
                             height: '100%', 
                             objectFit: 'contain'
                           }}
                         />
                       ) : (
                         <img
                           key={currentMediaIndex}
                           src={getMediaUrl(selectedPost.media[currentMediaIndex].url)}
                           alt={`Gallery Post Media ${currentMediaIndex + 1}`}
                           style={{ 
                             width: '100%', 
                             height: '100%', 
                             objectFit: 'contain'
                           }}
                         />
                       )}
                       
                       {/* Navigation Arrows - Only show if more than 1 media */}
                       {selectedPost.media.length > 1 && (
                         <>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               if (currentMediaIndex > 0) {
                                 setCurrentMediaIndex(currentMediaIndex - 1);
                               }
                             }}
                             disabled={currentMediaIndex === 0}
                             style={{
                               position: 'absolute',
                               left: '15px',
                               top: '50%',
                               transform: 'translateY(-50%)',
                               background: 'rgba(255, 255, 255, 0.8)',
                               border: 'none',
                               borderRadius: '50%',
                               width: '40px',
                               height: '40px',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               cursor: currentMediaIndex === 0 ? 'not-allowed' : 'pointer',
                               opacity: currentMediaIndex === 0 ? 0.3 : 1,
                               fontSize: '18px',
                               color: '#333',
                               transition: 'all 0.3s ease',
                               zIndex: 10
                             }}
                             onMouseEnter={(e) => {
                               if (currentMediaIndex > 0) {
                                 e.target.style.background = 'rgba(255, 255, 255, 1)';
                                 e.target.style.transform = 'translateY(-50%) scale(1.1)';
                               }
                             }}
                             onMouseLeave={(e) => {
                               e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                               e.target.style.transform = 'translateY(-50%) scale(1)';
                             }}
                           >
                             <FaChevronLeft />
                           </button>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               if (currentMediaIndex < selectedPost.media.length - 1) {
                                 setCurrentMediaIndex(currentMediaIndex + 1);
                               }
                             }}
                             disabled={currentMediaIndex === selectedPost.media.length - 1}
                             style={{
                               position: 'absolute',
                               right: '15px',
                               top: '50%',
                               transform: 'translateY(-50%)',
                               background: 'rgba(255, 255, 255, 0.8)',
                               border: 'none',
                               borderRadius: '50%',
                               width: '40px',
                               height: '40px',
                               display: 'flex',
                               alignItems: 'center',
                               justifyContent: 'center',
                               cursor: currentMediaIndex === selectedPost.media.length - 1 ? 'not-allowed' : 'pointer',
                               opacity: currentMediaIndex === selectedPost.media.length - 1 ? 0.3 : 1,
                               fontSize: '18px',
                               color: '#333',
                               transition: 'all 0.3s ease',
                               zIndex: 10
                             }}
                             onMouseEnter={(e) => {
                               if (currentMediaIndex < selectedPost.media.length - 1) {
                                 e.target.style.background = 'rgba(255, 255, 255, 1)';
                                 e.target.style.transform = 'translateY(-50%) scale(1.1)';
                               }
                             }}
                             onMouseLeave={(e) => {
                               e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                               e.target.style.transform = 'translateY(-50%) scale(1)';
                             }}
                           >
                             <FaChevronRight />
                           </button>
                           
                           {/* Media Indicators (Dots) */}
                           <div style={{
                             position: 'absolute',
                             bottom: '15px',
                             left: '50%',
                             transform: 'translateX(-50%)',
                             display: 'flex',
                             gap: '5px',
                             zIndex: 10
                           }}>
                             {selectedPost.media.map((_, index) => (
                               <div
                                 key={index}
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setCurrentMediaIndex(index);
                                 }}
                                 style={{
                                   width: '8px',
                                   height: '8px',
                                   borderRadius: '50%',
                                   background: currentMediaIndex === index ? 'white' : 'rgba(255, 255, 255, 0.5)',
                                   cursor: 'pointer',
                                   transition: 'all 0.3s ease'
                                 }}
                               />
                             ))}
                           </div>
                         </>
                       )}
                     </>
                   ) : (
                     <div style={{ 
                       color: '#fff', 
                       fontSize: '1.2rem',
                       textAlign: 'center'
                     }}>
                       No Media
                     </div>
                   )}
                 </div>

                 {/* Right Side - Details Section */}
                 <div style={{ 
                   flex: '0 0 400px',
                   display: 'flex',
                   flexDirection: 'column',
                   background: 'white',
                   borderLeft: '1px solid #e9ecef'
                 }}>
                   {/* Header with Profile */}
                   <div style={{
                     padding: '20px',
                     borderBottom: '1px solid #e9ecef',
                     display: 'flex',
                     justifyContent: 'space-between',
                     alignItems: 'center'
                   }}>
                     <div style={{ 
                fontWeight: '600',
                fontSize: '14px',
                       color: '#333',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '8px',
                       cursor: 'pointer',
                       transition: 'opacity 0.2s ease'
                     }}>
                       <FaInstagram style={{ color: '#E4405F', fontSize: '18px' }} />
                       nomu.ph
                       <span style={{ color: '#0095f6', fontSize: '16px', marginLeft: '4px' }}>✓</span>
                     </div>
                     <button 
                       onClick={() => {
                         setShowView(false);
                         setCurrentMediaIndex(0);
                         setSelectedPost(null);
                       }}
                       style={{
                         background: 'rgba(33, 44, 89, 0.1)',
                         border: '2px solid #212c59',
                         fontSize: '1.1rem',
                         cursor: 'pointer',
                         color: '#212c59',
                         width: '32px',
                         height: '32px',
                         borderRadius: '50%',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         fontWeight: '600'
                       }}
                       onMouseEnter={(e) => {
                         e.target.style.background = '#212c59';
                         e.target.style.borderColor = '#212c59';
                         e.target.style.color = 'white';
                         e.target.style.transform = 'scale(1.1)';
                         e.target.style.boxShadow = '0 4px 12px rgba(33, 44, 89, 0.3)';
                       }}
                       onMouseLeave={(e) => {
                         e.target.style.background = 'rgba(33, 44, 89, 0.1)';
                         e.target.style.borderColor = '#212c59';
                         e.target.style.color = '#212c59';
                         e.target.style.transform = 'scale(1)';
                         e.target.style.boxShadow = 'none';
                       }}
                     >
                       <FaTimes />
            </button>
          </div>

                   {/* Post Content */}
                   <div style={{ 
                     flex: '1',
                     padding: '20px',
                     overflowY: 'auto',
                     display: 'flex',
                     flexDirection: 'column',
                     justifyContent: 'space-between'
                   }}>
                     <div>
                       <div style={{
                         fontSize: '14px',
                         lineHeight: '1.4',
                         color: '#333',
                         marginBottom: '10px'
                       }}>
                         {selectedPost.description || selectedPost.title || 'No description'}
                       </div>

                       {selectedPost.tags && selectedPost.tags.length > 0 && (
                         <div style={{
                           fontSize: '14px',
                           color: '#00376b',
                           marginBottom: '10px'
                         }}>
                           {selectedPost.tags.map((tag, index) => (
                             <span key={index}>#{tag} </span>
                           ))}
                         </div>
                       )}
                     </div>

                     <div>
                       {/* Action Buttons */}
                       <div style={{
                         display: 'flex',
                         gap: '15px',
                         padding: '15px 0',
                         borderTop: '1px solid #e9ecef',
                         borderBottom: '1px solid #e9ecef'
                       }}>
                         <button 
                           style={{
                             background: 'none',
                             border: 'none',
                             fontSize: '24px',
                             color: '#333',
                             cursor: 'pointer',
                             padding: '5px',
                             transition: 'all 0.2s ease'
                           }}
                           onMouseEnter={(e) => {
                             e.target.style.color = '#0095f6';
                             e.target.style.transform = 'scale(1.1)';
                           }}
                           onMouseLeave={(e) => {
                             e.target.style.color = '#333';
                             e.target.style.transform = 'scale(1)';
                           }}
                         >
                           <FaHeart />
                         </button>
                         <button 
                           style={{
                             background: 'none',
                             border: 'none',
                             fontSize: '24px',
                             color: '#333',
                             cursor: 'pointer',
                             padding: '5px',
                             transition: 'all 0.2s ease'
                           }}
                           onMouseEnter={(e) => {
                             e.target.style.color = '#0095f6';
                             e.target.style.transform = 'scale(1.1)';
                           }}
                           onMouseLeave={(e) => {
                             e.target.style.color = '#333';
                             e.target.style.transform = 'scale(1)';
                           }}
                         >
                           <FaComment />
                         </button>
                       </div>

                       <div style={{
                         fontSize: '14px',
                         color: '#333',
                         marginBottom: '15px',
                         padding: '15px 0'
                       }}>
                         {postLikes[selectedPost._id] || 0} likes
                       </div>

                       <div style={{
                         fontSize: '12px',
                         color: '#8e8e8e',
                         textTransform: 'uppercase',
                         marginBottom: '15px'
                       }}>
                         {new Date(selectedPost.createdAt).toLocaleDateString('en-US', { 
                           month: 'short', 
                           day: 'numeric',
                           year: 'numeric'
                         }).toUpperCase()}
                       </div>

                       <div style={{
                         padding: '15px 0',
                         borderTop: '1px solid #e9ecef',
                         marginTop: '15px'
                       }}>
                         <input 
                           type="text"
                           placeholder="Add a comment..."
                           style={{
                             width: '100%',
                             border: 'none',
                             outline: 'none',
                             fontSize: '14px',
                             color: '#333',
                             background: 'transparent'
                           }}
                         />
                       </div>
                     </div>
                   </div>
                 </div>
               </>
        )}
           </div>
         </div>
       )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)'
          }}
        >
          <style>
            {`
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
              .admin-modal .admin-btn-secondary {
                background: white !important;
                color: #b08d57 !important;
                border: 2px solid #b08d57 !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1) !important;
                flex: 1 !important;
                font-size: 0.85rem !important;
              }
              .admin-modal .admin-btn-secondary:hover {
                background: #f8f6f0 !important;
                border-color: #b08d57 !important;
                color: #b08d57 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
              }
              .admin-modal .admin-btn-danger {
                background: white !important;
                color: #dc3545 !important;
                border: 2px solid #dc3545 !important;
                border-radius: 8px !important;
                padding: 12px 24px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(220, 53, 69, 0.1) !important;
                flex: 1 !important;
                font-size: 0.85rem !important;
              }
              .admin-modal .admin-btn-danger:hover {
                background: #dc3545 !important;
                border-color: #dc3545 !important;
                color: white !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
              }
            `}
          </style>
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideIn 0.3s ease-out',
              transform: 'scale(1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)',
              background: '#f8f9fa',
              borderRadius: '20px'
            }}
          >
            <div style={{ 
              position: 'relative', 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '24px 28px',
              borderRadius: '20px 20px 0 0',
              borderBottom: '1px solid #e9ecef'
            }}>
              <h3 style={{ 
                margin: '0', 
                color: '#212c59', 
                fontSize: '1.5rem', 
                fontWeight: '700',
                fontFamily: "'Montserrat', sans-serif"
              }}>Confirm Delete</h3>
            </div>
            
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px' }}>
              Are you sure you want to delete this gallery post?
            </div>
            
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  // Dispatch event to close all dropdowns
                  document.dispatchEvent(new CustomEvent('modalClose'));
                  setShowDelete(false);
                }}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                className="admin-btn admin-btn-danger"
              >
                Delete Post
              </button>
            </div>
            </div>
          </div>
        )}

      {/* Edit Post Modal */}
      {showEdit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <style>
            {`
              .admin-modal .admin-btn-primary {
                background: white !important;
                color: #212c59 !important;
                border: 2px solid #212c59 !important;
                border-radius: 8px !important;
                padding: 8px 12px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1) !important;
                flex: 0 0 auto !important;
                min-width: 0 !important;
                max-width: none !important;
                font-size: 0.85rem !important;
                width: calc(50% - 40px) !important;
                box-sizing: border-box !important;
                margin: 0 !important;
              }
              .admin-modal .admin-btn-primary:hover {
                background: #212c59 !important;
                border-color: #212c59 !important;
                color: white !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3) !important;
              }
              .admin-modal .admin-btn-secondary {
                background: white !important;
                color: #b08d57 !important;
                border: 2px solid #b08d57 !important;
                border-radius: 8px !important;
                padding: 8px 12px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(176, 141, 87, 0.1) !important;
                flex: 0 0 auto !important;
                min-width: 0 !important;
                max-width: none !important;
                font-size: 0.85rem !important;
                width: calc(50% - 40px) !important;
                box-sizing: border-box !important;
                margin: 0 !important;
              }
              .admin-modal .admin-btn-secondary:hover {
                background: #f8f6f0 !important;
                border-color: #b08d57 !important;
                color: #b08d57 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(176, 141, 87, 0.3) !important;
              }
              .admin-modal input,
              .admin-modal select,
              .admin-modal textarea,
              .admin-modal .enhanced-dropdown,
              .admin-modal .enhanced-dropdown .dropdown-button,
              .admin-modal .enhanced-dropdown .dropdown-button input,
              .admin-modal .form-control,
              .admin-modal .admin-form-input {
                background-color: #f8f9fa !important;
                height: 40px !important;
                min-height: 40px !important;
                max-height: 40px !important;
                padding: 8px 12px !important;
                font-size: 0.8rem !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                box-sizing: border-box !important;
                line-height: 1.2 !important;
                vertical-align: middle !important;
              }
              .admin-modal .admin-form-actions {
                display: flex !important;
                gap: 12px !important;
                justify-content: center !important;
                margin-top: 4px !important;
                max-width: 100% !important;
                width: 100% !important;
                box-sizing: border-box !important;
                padding: 0 !important;
              }
            `}
          </style>
          <div className="admin-modal" style={{
            background: '#f8f9fa',
            borderRadius: '16px',
            padding: '12px 8px',
            width: '100%',
            maxWidth: '460px',
            maxHeight: 'calc(100vh - 15px)',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid #e9ecef',
              background: '#f8f9fa',
              paddingTop: '4px'
            }}>
              <h3 style={{margin: 0, color: '#212c59', fontWeight: '700', textAlign: 'center', fontSize: '1rem'}}>
                Edit Gallery Post
              </h3>
            </div>
            <form id="edit-post-form" className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8f9fa', marginBottom: '0px', paddingBottom: '0px' }}
          onSubmit={handleEditPost}
        >
              {/* Error Display inside Edit Modal */}
          {modalError && (
                <div className="error-message" style={{
                  background: '#ffebee',
                  border: '1px solid #f44336',
                  color: '#f44336',
                  padding: '4px 8px',
              borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '0.85rem'
                }}>
                  <p style={{ margin: 0 }}>{modalError}</p>
                </div>
              )}
              
              {/* Success Display inside Edit Modal */}
          {modalSuccess && (
                <div className="success-message" style={{
                  background: '#e8f5e9',
                  border: '1px solid #4caf50',
                  color: '#2e7d32',
                  padding: '4px 8px',
              borderRadius: '8px',
                  marginBottom: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  <p style={{ margin: 0 }}>{modalSuccess}</p>
                </div>
              )}

              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Title</label>
            <input
              key="edit-title-input"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Enter post title"
              autoComplete="off"
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                boxSizing: 'border-box',
                    width: '100%'
              }}
            />
          </div>

              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
                  rows="1"
              placeholder="Enter post description"
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                boxSizing: 'border-box',
                    width: '100%',
                    resize: 'none',
                    overflow: 'hidden'
              }}
            />
          </div>

              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Tags</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="Enter tags separated by commas"
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
          </div>


              <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Add New Media (Optional)</label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
                  className="admin-form-input"
              style={{
                    padding: '8px 12px',
                    height: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8f9fa',
                    boxSizing: 'border-box',
                    width: '100%'
                  }}
                />
          </div>

          {/* Media Preview */}
          {formData.media.length > 0 && (
                <div className="admin-form-group" style={{ marginBottom: '12px' }}>
                  <label className="admin-form-label" style={{ marginBottom: '4px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59', display: 'block' }}>Current Media:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.3rem' }}>
                {formData.media.map((media, index) => (
                  <div key={index} style={{ position: 'relative' }}>
                    {media.type === 'video' ? (
                      <video
                        src={media.preview}
                            style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                        muted
                      />
                    ) : (
                      <img
                        src={media.preview}
                        alt={`Preview ${index + 1}`}
                            style={{ width: '100%', height: '60px', objectFit: 'cover', borderRadius: '6px' }}
                      />
                    )}
                    {media.isExisting && (
                      <div style={{
                        position: 'absolute',
                            top: '2px',
                            left: '2px',
                        background: 'rgba(33, 44, 89, 0.8)',
                        color: 'white',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontSize: '8px',
                        fontWeight: '600'
                      }}>
                        EXISTING
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      style={{
                        position: 'absolute',
                            top: '2px',
                            right: '2px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                            fontSize: '10px'
                      }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
            </form>
            
            <div className="admin-form-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center', 
              marginTop: '0px',
              paddingTop: '0px',
              maxWidth: '100%',
              width: '100%',
              boxSizing: 'border-box'
            }}>
            <button
              type="button"
                onClick={() => {
                  // Dispatch event to close all dropdowns
                  document.dispatchEvent(new CustomEvent('modalClose'));
                  closeEditModal();
                }}
                className="admin-btn admin-btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit"
              form="edit-post-form"
              disabled={isEditing}
                className="admin-btn admin-btn-primary"
            >
              {isEditing ? 'Updating...' : 'Update Post'}
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryManagement;