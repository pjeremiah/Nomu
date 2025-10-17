import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Search, 
  Eye,
  EyeOff,
  Users,
  Shield,
  UserCheck
} from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';

// Security utility functions
const sanitizeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const maskEmail = (email) => {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1];
  return `${maskedLocal}@${domain}`;
};

const validateInput = (input, type) => {
  if (!input) return false;
  
  switch (type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(input);
    case 'name':
      const nameRegex = /^[a-zA-Z\s]{2,50}$/;
      return nameRegex.test(input);
    case 'password':
      return input.length >= 6;
    default:
      return true;
  }
};

// Enhanced password validation function (same as SignUpForm)
const validatePassword = (password) => {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
};

const ManageAdmins = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const { showLogoutConfirm } = useModalContext();
  
  // API URL configuration
  const API_URL = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false); 
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  // Form states
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'staff',
    status: 'inactive'
  });
  
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: '',
    status: ''
  });
  
  const [resetForm, setResetForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    if (showAddModal || showEditModal || showResetModal || showDeleteModal) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Apply styles
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('position', 'fixed', 'important');
      document.body.style.setProperty('top', `-${scrollY}px`, 'important');
      document.body.style.setProperty('width', '100%', 'important');
      document.body.classList.add('modal-open');
      
      // Prevent scroll events
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('keydown', (e) => {
        // Only prevent navigation keys, not space (32) for input fields
        if ([33, 34, 35, 36, 37, 38, 39, 40].includes(e.keyCode)) {
          e.preventDefault();
        }
      });
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      document.body.classList.remove('modal-open');
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
      
      // Remove event listeners
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    }

    // Cleanup on unmount
    return () => {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
      document.body.style.removeProperty('position');
      document.body.style.removeProperty('top');
      document.body.style.removeProperty('width');
      document.body.classList.remove('modal-open');
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [showAddModal, showEditModal, showResetModal, showDeleteModal]);

  // Fetch current user info
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setCurrentUser(data);
        }
      })
      .catch(err => {});
    }
  }, [API_URL]);

  // Fetch admins
  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdmins(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch admins');
      }
    } catch (err) {
      setError('Network error occurred');

    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // Real-time status update function - removed as it's not being used

  useEffect(() => {
    if (currentUser) {
      fetchAdmins();
    }
  }, [currentUser, fetchAdmins]);

  // Real-time status monitoring
  useEffect(() => {
    if (!currentUser) return;

    // Set up interval to check for status updates
    const statusCheckInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admins`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const updatedAdmins = await response.json();
          setAdmins(prevAdmins => {
            // Only update if there are actual changes
            const hasChanges = JSON.stringify(prevAdmins) !== JSON.stringify(updatedAdmins);
            return hasChanges ? updatedAdmins : prevAdmins;
          });
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    }, 5000); // Check every 5 seconds for more responsive status updates

    return () => clearInterval(statusCheckInterval);
  }, [currentUser, API_URL]);

  // Update current user status to active when component mounts
  useEffect(() => {
    if (currentUser && currentUser.id) {
      // Update the current user's status in the admins list to active
      setAdmins(prevAdmins => 
        prevAdmins.map(admin => 
          admin._id === currentUser.id 
            ? { ...admin, status: 'active' }
            : admin
        )
      );
    }
  }, [currentUser]);

  // Handle page unload - set admin status to inactive when leaving
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentUser && currentUser.id) {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          if (token) {
            // Use sendBeacon for reliable delivery even if page is closing
            const data = JSON.stringify({});
            navigator.sendBeacon(`${API_URL}/api/auth/logout`, data);
          }
        } catch (err) {
          console.error('Error setting status to inactive:', err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, API_URL]);

  // Handle add admin
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    // Enhanced client-side validation
    if (!addForm.fullName.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!addForm.email.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!addForm.password.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!validateInput(addForm.fullName, 'name')) {
      setError('Full name must be 2-50 characters and contain only letters and spaces');
      return;
    }
    
    if (!validateInput(addForm.email, 'email')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!validatePassword(addForm.password)) {
      setError('Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*(),.?":{}|<>)');
      return;
    }
    
    if (!addForm.role || !['superadmin', 'manager', 'staff'].includes(addForm.role)) {
      setError('Please select a valid role');
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: addForm.fullName,
          email: addForm.email,
          password: addForm.password,
          role: addForm.role
          // Status is auto-managed, not sent to backend
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins([data.admin, ...admins]);
        setShowAddModal(false);
        setAddForm({
          fullName: '',
          email: '',
          password: '',
          role: 'staff',
          status: 'inactive'
        });
        setError('');
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'admin_created', admin: addForm.fullName, role: addForm.role } 
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create admin');
      }
    } catch (err) {
      setError('Network error occurred');

    }
  };

  // Handle edit admin
  const handleEditAdmin = async (e) => {
    e.preventDefault();
    
    // Enhanced client-side validation
    if (!editForm.fullName.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!editForm.email.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!validateInput(editForm.fullName, 'name')) {
      setError('Full name must be 2-50 characters and contain only letters and spaces');
      return;
    }
    
    if (!validateInput(editForm.email, 'email')) {
      setError('Please enter a valid email address');
      return;
    }
    
    if (!editForm.role || !['superadmin', 'manager', 'staff'].includes(editForm.role)) {
      setError('Please select a valid role');
      return;
    }
    
    if (!editForm.status || !['active', 'inactive'].includes(editForm.status)) {
      setError('Please select a valid status');
      return;
    }
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admins/${selectedAdmin._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(admins.map(admin => 
          admin._id === selectedAdmin._id ? data.admin : admin
        ));
        setShowEditModal(false);
        setSelectedAdmin(null);
        setError('');
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'admin_updated', admin: editForm.fullName } 
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update admin');
      }
    } catch (err) {
      setError('Network error occurred');

    }
  };

  // Handle reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!resetForm.newPassword.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!resetForm.confirmPassword.trim()) {
      setError('Please fill up all blanks');
      return;
    }
    
    if (!validatePassword(resetForm.newPassword)) {
      setError('Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (!@#$%^&*(),.?":{}|<>)');
      return;
    }
    
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admins/${selectedAdmin._id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: resetForm.newPassword })
      });

      if (response.ok) {
        setShowResetModal(false);
        setSelectedAdmin(null);
        setResetForm({ newPassword: '', confirmPassword: '' });
        setError('');
        alert('Password reset successfully');
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'admin_password_reset', admin: selectedAdmin.fullName } 
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error occurred');

    }
  };

  // Handle delete admin
  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    
    try {

      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admins/${selectedAdmin._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });



      if (response.ok) {
        await response.json();

        
        setShowDeleteModal(false);
        setSelectedAdmin(null);
        setError('');
        
        // Remove the deleted admin from the list
        const updatedAdmins = admins.filter(admin => admin._id !== selectedAdmin._id);
        setAdmins(updatedAdmins);
        
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'admin_deleted', admin: selectedAdmin.fullName } 
        }));

      } else {
        const errorData = await response.json();

        setError(errorData.message || 'Failed to delete admin');
      }
    } catch (err) {

      setError('Network error occurred');
    }
  };



  // Open edit modal
  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      fullName: admin.fullName,
      email: admin.email,
      role: admin.role,
      status: admin.status
    });
    setError(''); // Clear any previous errors
    setShowEditModal(true);
  };

  // Open reset password modal
  const openResetModal = (admin) => {
    setSelectedAdmin(admin);
    setError(''); // Clear any previous errors
    setShowResetModal(true);
  };

  // Filter admins based on search and filters
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = (admin.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (admin.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || admin.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Check permissions
  const canAddAdmin = currentUser?.role === 'superadmin';
  const canEditAdmin = (admin) => {
    if (currentUser?.role === 'superadmin') return true;
    if (currentUser?.role === 'manager') return admin.role === 'staff';
    return false;
  };
  const canDeleteAdmin = currentUser?.role === 'superadmin';
  const canResetPassword = currentUser?.role === 'superadmin';

  // Helper function to display role names
  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'superadmin':
        return 'Owner';
      case 'manager':
        return 'Manager';
      case 'staff':
        return 'Staff';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  // Additional security check - only allow superadmin to access this component
  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="access-denied-container">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>Only Super Admin can access the Manage Admins section.</p>
          <p>This section requires Super Admin privileges.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      fontFamily: "'Montserrat', sans-serif",
      color: '#212c59',
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      {/* Page Header */}
      <PageHeader 
        title="Manage Admins" 
        icon={Users}
      />

      {/* Search and Filters */}
      <div style={{
        background: '#fff',
        padding: '0.75rem',
        borderRadius: '6px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
        marginBottom: '1rem',
        border: '1px solid #e9ecef',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '200px'
        }}>
          <Search 
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6c757d',
              fontSize: '1rem'
            }}
          />
          <input
            type="text"
            id="search-admins"
            name="search"
            placeholder="Search admins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.5rem 0.5rem 2.5rem',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              fontSize: '0.8rem',
              outline: 'none',
              transition: 'border-color 0.2s ease',
              background: '#fff'
            }}
            onFocus={(e) => e.target.style.borderColor = '#003466'}
            onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
          />
        </div>
        
        <EnhancedDropdown
          options={[
            { value: 'all', label: 'All Roles' },
            { value: 'superadmin', label: 'Owner' },
            { value: 'manager', label: 'Manager' },
            { value: 'staff', label: 'Staff' }
          ]}
          value={roleFilter}
          onChange={setRoleFilter}
          minWidth="160px"
        />
        
        <EnhancedDropdown
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          minWidth="160px"
        />
      </div>

      {/* Error Display */}
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

      {/* Admins Grid - aligned with search bar */}
      <div className="menu-grid">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading admins...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="empty-state">
            <p>No admins found</p>
          </div>
        ) : (
          filteredAdmins.map((admin) => (
            <div key={admin._id} className="menu-item">
              <div className="admin-avatar">
                <div className="admin-avatar-icon">
                  {admin.role === 'superadmin' ? <Shield size={24} /> : 
                   admin.role === 'manager' ? <Users size={24} /> : 
                   <UserCheck size={24} />}
                </div>
              </div>
              
              <div className="admin-actions">
                {canEditAdmin(admin) && (
                  <button
                    onClick={() => openEditModal(admin)}
                    className="action-icon edit"
                    title="Edit Admin"
                  >
                    <Edit size={16} />
                  </button>
                )}
                
                {canResetPassword && (
                  <button
                    onClick={() => openResetModal(admin)}
                    className="action-icon reset"
                    title="Reset Password"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
                
                {/* Only owner can delete staff and manager accounts */}
                {canDeleteAdmin && admin._id !== currentUser.id && 
                 (admin.role === 'staff' || admin.role === 'manager') && (
                  <button
                    onClick={() => {
                      setSelectedAdmin(admin);
                      setShowDeleteModal(true);
                    }}
                    className="action-icon delete"
                    title="Delete Admin"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="menu-item-details">
                <h3>{sanitizeHtml(admin.fullName)}</h3>
                <div className="admin-info">
                  <div className="admin-email" title="Email address is protected for privacy">
                    {maskEmail(admin.email)}
                  </div>
                  <div className="admin-role">
                    <span className={`role-badge ${admin.role === 'superadmin' ? 'owner' : admin.role}`}>
                      {getRoleDisplayName(admin.role)}
                    </span>
                  </div>
                  <div className="admin-status">
                    <span className={`status-badge ${admin.status}`}>
                      {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                    </span>
                    {!admin.lastLoginAt && (
                      <span className="new-admin-badge">New</span>
                    )}
                  </div>
                  {admin._id === currentUser.id && (
                    <div className="current-user-indicator">You</div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Add Admin Button */}
      {canAddAdmin && !showAddModal && !showEditModal && !showDeleteModal && (
        <div className="menu-actions" style={{
          filter: showLogoutConfirm ? 'blur(2px)' : 'none',
          opacity: showLogoutConfirm ? 0.6 : 1,
          pointerEvents: showLogoutConfirm ? 'none' : 'auto',
          bottom: '1rem',
          right: '1rem',
          position: 'fixed',
          zIndex: 1000
        }}>
          <button
            onClick={() => {
              setShowAddModal(true);
              setError('');
            }}
            className="add-item-btn"
          >
            <Plus size={16} />
            Add New Admin
          </button>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <ResponsiveModal
          show={showAddModal}
          onHide={() => setShowAddModal(false)}
          title="Add New Admin"
          size="medium"
        >
            <form onSubmit={handleAddAdmin} className="admin-form">
              {/* Error Display inside Add Modal */}
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
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label htmlFor="add-fullname" className="admin-form-label">Full Name</label>
                <input
                  type="text"
                  id="add-fullname"
                  name="fullname"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({...addForm, fullName: sanitizeHtml(e.target.value)})}
                  className="admin-form-input"
                  placeholder="Enter full name"
                  maxLength={50}
                />
              </div>
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label htmlFor="add-email" className="admin-form-label">Email</label>
                <input
                  type="email"
                  id="add-email"
                  name="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({...addForm, email: e.target.value.toLowerCase().trim()})}
                  className="admin-form-input"
                  placeholder="Enter email address"
                  maxLength={100}
                />
              </div>
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label htmlFor="add-password" className="admin-form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="add-password"
                    name="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({...addForm, password: e.target.value})}
                    className="admin-form-input"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Role</label>
                  <EnhancedDropdown
                    options={[
                      { value: 'staff', label: 'Staff' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'superadmin', label: 'Owner' }
                    ]}
                    value={addForm.role}
                    onChange={(value) => setAddForm({...addForm, role: value})}
                    placeholder="Select role"
                    width="100%"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Status</label>
                  <div className="admin-form-status-display">
                    <span className={`status-badge ${addForm.status}`}>
                      {addForm.status.charAt(0).toUpperCase() + addForm.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setError('');
                  }}
                  className="admin-btn admin-btn-secondary"
                  style={{
                    background: 'white',
                    color: '#b08d57',
                    border: '2px solid #b08d57',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(176, 141, 87, 0.1)',
                    flex: '1',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f8f6f0';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(176, 141, 87, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(176, 141, 87, 0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  style={{
                    background: 'white',
                    color: '#212c59',
                    border: '2px solid #212c59',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
                    flex: '1',
                    minWidth: '120px',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#212c59';
                    e.target.style.borderColor = '#212c59';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(33, 44, 89, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#212c59';
                    e.target.style.color = '#212c59';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(33, 44, 89, 0.1)';
                  }}
                >
                  Add Admin
                </button>
              </div>
            </form>
        </ResponsiveModal>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <ResponsiveModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          title="Edit Admin"
          size="medium"
        >
            <form onSubmit={handleEditAdmin} className="admin-form">
              {/* Error Display inside Edit Modal */}
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
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label className="admin-form-label">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({...editForm, fullName: sanitizeHtml(e.target.value)})}
                  className="admin-form-input"
                  maxLength={50}
                />
              </div>
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label className="admin-form-label">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value.toLowerCase().trim()})}
                  className="admin-form-input"
                  maxLength={100}
                />
              </div>
              
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Role</label>
                  <EnhancedDropdown
                    options={[
                      { value: 'staff', label: 'Staff' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'superadmin', label: 'Owner' }
                    ]}
                    value={editForm.role}
                    onChange={(value) => setEditForm({...editForm, role: value})}
                    placeholder="Select role"
                    width="100%"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Status</label>
                  <div className="admin-form-status-display">
                    <span className={`status-badge ${editForm.status}`}>
                      {editForm.status.charAt(0).toUpperCase() + editForm.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    // Dispatch event to close all dropdowns
                    document.dispatchEvent(new CustomEvent('modalClose'));
                    setShowEditModal(false);
                    setError('');
                  }}
                  className="admin-btn admin-btn-secondary"
                  style={{
                    background: 'white',
                    color: '#b08d57',
                    border: '2px solid #b08d57',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(176, 141, 87, 0.1)',
                    flex: '1',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f8f6f0';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(176, 141, 87, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(176, 141, 87, 0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  style={{
                    background: 'white',
                    color: '#212c59',
                    border: '2px solid #212c59',
                    borderRadius: '12px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
                    flex: '1',
                    minWidth: '120px',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#212c59';
                    e.target.style.borderColor = '#212c59';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(33, 44, 89, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#212c59';
                    e.target.style.color = '#212c59';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(33, 44, 89, 0.1)';
                  }}
                >
                  Update Admin
                </button>
              </div>
            </form>
        </ResponsiveModal>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedAdmin && (
        <ResponsiveModal
          show={showResetModal}
          onHide={() => setShowResetModal(false)}
          title="Reset Password"
          size="small"
        >
            <div className="reset-password-text" style={{ marginBottom: '12px' }}>
              Reset password for <strong>{selectedAdmin.fullName}</strong>
            </div>
            
            <form onSubmit={handleResetPassword} className="admin-form">
              {/* Error Display inside Reset Password Modal */}
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
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label className="admin-form-label">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={resetForm.newPassword}
                    onChange={(e) => setResetForm({...resetForm, newPassword: e.target.value})}
                    className="admin-form-input"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="password-toggle-btn"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="admin-form-group" style={{ marginBottom: '10px' }}>
                <label className="admin-form-label">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={resetForm.confirmPassword}
                    onChange={(e) => setResetForm({...resetForm, confirmPassword: e.target.value})}
                    className="admin-form-input"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle-btn"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setError('');
                  }}
                  className="admin-btn admin-btn-secondary"
                  style={{
                    background: 'white',
                    color: '#b08d57',
                    border: '2px solid #b08d57',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(176, 141, 87, 0.1)',
                    flex: '1',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f8f6f0';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(176, 141, 87, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(176, 141, 87, 0.1)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-success"
                  style={{
                    background: 'white',
                    color: '#28a745',
                    border: '2px solid #28a745',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(40, 167, 69, 0.1)',
                    flex: '1',
                    minWidth: '120px',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#28a745';
                    e.target.style.borderColor = '#28a745';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#28a745';
                    e.target.style.color = '#28a745';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.1)';
                  }}
                >
                  Reset Password
                </button>
              </div>
            </form>
        </ResponsiveModal>
      )}

      {/* Delete Admin Modal */}
      {showDeleteModal && selectedAdmin && (
        <ResponsiveModal
          show={showDeleteModal}
          onHide={() => setShowDeleteModal(false)}
          title="Delete Admin"
          size="small"
        >
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '16px' }}>
              Are you sure you want to delete admin <strong>{selectedAdmin.fullName}</strong>?
            </div>
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="admin-btn admin-btn-secondary"
                style={{
                  background: 'white',
                  color: '#b08d57',
                  border: '2px solid #b08d57',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(176, 141, 87, 0.1)',
                  flex: '1',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f8f6f0';
                  e.target.style.borderColor = '#b08d57';
                  e.target.style.color = '#b08d57';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(176, 141, 87, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#b08d57';
                  e.target.style.color = '#b08d57';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(176, 141, 87, 0.1)';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                className="admin-btn admin-btn-danger"
                style={{
                  background: 'white',
                  color: '#dc3545',
                  border: '2px solid #dc3545',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 53, 69, 0.1)',
                  flex: '1',
                  minWidth: '120px',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc3545';
                  e.target.style.borderColor = '#dc3545';
                  e.target.style.color = 'white';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#dc3545';
                  e.target.style.color = '#dc3545';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(220, 53, 69, 0.1)';
                }}
              >
                Delete Admin
              </button>
            </div>
        </ResponsiveModal>
      )}

      {/* Bottom spacer to prevent content cutoff */}
      <div style={{ height: '100px' }}></div>
    </div>
  );
};

export default ManageAdmins;
