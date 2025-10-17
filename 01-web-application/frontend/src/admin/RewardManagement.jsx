import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaCog } from 'react-icons/fa';
import { Gift } from 'lucide-react';
import { MdCardGiftcard, MdDescription, MdDateRange } from "react-icons/md";
import { Search } from "lucide-react";
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

const REWARD_TYPES = ["Loyalty Bonus"];
const REWARD_STATUS = ["Active", "Inactive", "Scheduled", "Expired"];

const emptyForm = { 
  title: "", 
  description: "", 
  rewardType: REWARD_TYPES[0], 
  pointsRequired: "", 
  startDate: "",
  endDate: "",
  usageLimit: "",
  status: "Active"
};

const AddEditRewardModal = ({ show, onHide, onSave, editing, initialData, modalError }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [initialData, show]);


  const validateForm = () => {
    const newErrors = {};
    
    if (!form.title || form.title.trim() === "") newErrors.title = "Title is required";
    if (!form.description || form.description.trim() === "") newErrors.description = "Description is required";
    if (!form.pointsRequired || form.pointsRequired === "" || form.pointsRequired <= 0) newErrors.pointsRequired = "Points Required must be greater than 0";
    if (!form.usageLimit || form.usageLimit === "" || form.usageLimit <= 0) newErrors.usageLimit = "Usage Limit must be greater than 0";
    if (!form.startDate || form.startDate === "") newErrors.startDate = "Start Date is required";
    if (!form.endDate || form.endDate === "") newErrors.endDate = "End Date is required";
    if (form.startDate && form.endDate && new Date(form.startDate) >= new Date(form.endDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(form);
      setForm(emptyForm);
      setErrors({});
    }
  };

  const getRewardLabel = () => {
    switch (form.rewardType) {
      case "Loyalty Bonus":
        return "Points Required";
      default:
        return "Points Required";
    }
  };

  return (
    <ResponsiveModal
      show={show}
      onHide={onHide}
      title={editing ? 'Edit Reward' : 'Add New Reward'}
      size="large"
    >
      <form className="admin-form" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Error Display inside Add/Edit Modal */}
          {modalError && (
            <div className="error-message" style={{
              background: '#ffebee',
              border: '1px solid #f44336',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#c62828',
              fontSize: '0.9rem'
            }}>
              <p>{modalError}</p>
            </div>
          )}
          
          <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
            <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Reward Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="admin-form-input"
              placeholder="Enter reward title"
              style={{ 
                padding: '0.4rem 0.6rem', 
                height: '40px',
                lineHeight: '1.5',
                verticalAlign: 'middle'
              }}
            />
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>
          
          <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
            <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Description</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="admin-form-input"
              placeholder="Enter detailed reward description"
              rows={1}
              style={{ padding: '0.4rem 0.6rem', minHeight: '50px' }}
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>
          
          <div className="admin-form-row" style={{ marginBottom: '0.25rem' }}>
            <div className="admin-form-group">
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Reward Type</label>
              <EnhancedDropdown
                options={REWARD_TYPES.map(type => ({ value: type, label: type }))}
                value={form.rewardType}
                onChange={(value) => setForm((p) => ({ ...p, rewardType: value }))}
                placeholder="Select reward type"
                width="100%"
              />
            </div>
            
            <div className="admin-form-group">
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Status</label>
              <EnhancedDropdown
                options={REWARD_STATUS.map(status => ({ value: status, label: status }))}
                value={form.status}
                onChange={(value) => setForm((p) => ({ ...p, status: value }))}
                placeholder="Select status"
                width="100%"
              />
            </div>
          </div>

          <div className="admin-form-row" style={{ marginBottom: '0.25rem' }}>
            <div className="admin-form-group">
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>{getRewardLabel()}</label>
              <input
                type="number"
                required
                value={form.pointsRequired}
                onChange={(e) => setForm((p) => ({ ...p, pointsRequired: e.target.value }))}
                className="admin-form-input"
                placeholder="e.g. 5, 10, 15"
                style={{ 
                  padding: '0.4rem 0.6rem', 
                  height: '40px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle'
                }}
              />
              {errors.pointsRequired && <div className="error-message">{errors.pointsRequired}</div>}
            </div>
            
            <div className="admin-form-group">
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Usage Limit (per customer)</label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                className="admin-form-input"
                placeholder="Leave empty for unlimited"
                style={{ 
                  padding: '0.4rem 0.6rem', 
                  height: '40px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle'
                }}
              />
              {errors.usageLimit && <div className="error-message">{errors.usageLimit}</div>}
            </div>
          </div>

          <div className="admin-form-row" style={{ marginBottom: '0.25rem', gap: '1rem', justifyContent: 'center' }}>
            <div className="admin-form-group" style={{ flex: '0 0 20%', maxWidth: '220px' }}>
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Start Date</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="admin-form-input"
                style={{ 
                  padding: '0.4rem 0.6rem', 
                  height: '40px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle',
                  width: '100%'
                }}
              />
              {errors.startDate && <div className="error-message">{errors.startDate}</div>}
            </div>
            
            <div className="admin-form-group" style={{ flex: '0 0 20%', maxWidth: '220px' }}>
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>End Date</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="admin-form-input"
                style={{ 
                  padding: '0.4rem 0.6rem', 
                  height: '40px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle',
                  width: '100%'
                }}
              />
              {errors.endDate && <div className="error-message">{errors.endDate}</div>}
            </div>
          </div>
          
      </form>
      
      <div className="admin-form-actions" style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'flex-end', 
        padding: '1rem',
        borderTop: '1px solid #e9ecef',
        background: '#f8f9fa',
        flexShrink: 0
      }}>
          <button
            type="button"
            onClick={() => {
              // Dispatch event to close all dropdowns
              document.dispatchEvent(new CustomEvent('modalClose'));
              onHide();
            }}
            className="admin-btn admin-btn-secondary"
            style={{
              background: 'white',
              color: '#6c757d',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              fontSize: '0.9rem',
              minWidth: '100px'
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
            onClick={handleSave}
            className="admin-btn admin-btn-primary"
            style={{
              background: '#212c59',
              color: 'white',
              border: '1px solid #212c59',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              fontSize: '0.9rem',
              minWidth: '100px',
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
            {editing ? "Save Changes" : "Add Reward"}
          </button>
        </div>
    </ResponsiveModal>
  );
};

const RewardManagement = () => {
  const [rewards, setRewards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [currentReward, setCurrentReward] = useState(null);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    if (showModal || showDeleteConfirm) {
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
  }, [showModal, showDeleteConfirm]);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT token to get user info
          const payload = JSON.parse(atob(token.split('.')[1]));
          setIsAuthenticated(true);
          setUserRole(payload.role);
        } catch (err) {
          console.error('Error decoding token:', err);
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch rewards from API
  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/rewards`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch rewards');
      }
      
      const rewardsData = await response.json();
      setRewards(rewardsData);
    } catch (err) {
      console.error('Network error:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (userRole === 'superadmin' || userRole === 'manager' || userRole === 'staff')) {
      fetchRewards();
    }
  }, [isAuthenticated, userRole]);

  const handleSaveReward = async (rewardData) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      
      const requestData = {
        title: rewardData.title,
        description: rewardData.description,
        rewardType: rewardData.rewardType,
        pointsRequired: parseInt(rewardData.pointsRequired) || 0,
        startDate: rewardData.startDate,
        endDate: rewardData.endDate,
        usageLimit: parseInt(rewardData.usageLimit) || 0,
        status: rewardData.status
      };
      
      
      const url = editing ? `${API_BASE}/api/rewards/${currentReward._id}` : `${API_BASE}/api/rewards`;
      const method = editing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${editing ? 'update' : 'create'} reward`);
      }
      
      await fetchRewards(); // Refresh the list
      setShowModal(false);
      setEditing(false);
      setCurrentReward(null);
      
      // Trigger activity refresh
      window.dispatchEvent(new CustomEvent('adminAction'));
    } catch (err) {
      console.error('Network error:', err);
      setModalError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReward = async (rewardId) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/rewards/${rewardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete reward');
      }
      
      await fetchRewards(); // Refresh the list
      setShowDeleteConfirm(null);
      
      // Trigger activity refresh
      window.dispatchEvent(new CustomEvent('adminAction'));
    } catch (err) {
      console.error('Delete error:', err);
      setError(`Error deleting reward: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (rewardId) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/rewards/${rewardId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle reward status');
      }
      
      await fetchRewards(); // Refresh the list
      
      // Trigger activity refresh
      window.dispatchEvent(new CustomEvent('adminAction'));
    } catch (err) {
      console.error('Toggle status error:', err);
      setError(`Error toggling reward status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRewards = rewards.filter(reward => {
    const matchesFilter = filter === "All" || reward.status === filter;
    const matchesSearch = searchTerm === "" || 
      reward.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reward.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusCounts = () => {
    return REWARD_STATUS.reduce((acc, status) => {
      acc[status] = rewards.filter(r => r.status === status).length;
      return acc;
    }, {});
  };

  const statusCounts = getStatusCounts();

  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', opts);
  };

  const getRewardText = (reward) => {
    switch (reward.rewardType) {
      case "Loyalty Bonus":
        return `${reward.pointsRequired} points required`;
      default:
        return `${reward.pointsRequired} points required`;
    }
  };

  // Show authentication required message if not logged in as admin
  if (!isAuthenticated) {
    return (
      <div className="reward-management" style={{ padding: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>
            REWARD MANAGEMENT
          </h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
          <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>Authentication Required</h3>
          <p>You need to be logged in as an admin to access Reward Management.</p>
          <p>Please log in with your admin credentials to continue.</p>
        </div>
      </div>
    );
  }

  if (userRole && !['superadmin', 'manager', 'staff'].includes(userRole)) {
  return (
    <div className="reward-management" style={{ padding: '2rem' }}>
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>
          REWARD MANAGEMENT
        </h1>
      </div>
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
          <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h3>
          <p>You don't have permission to access Reward Management.</p>
          <p>Admin privileges are required.</p>
        </div>
      </div>
    );
  }

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
        title="Reward Management" 
        icon={Gift}
      />

      {/* Error Display */}
      {error && (
        <div className="error-message" style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <p>{error}</p>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={fetchRewards}
              style={{
                marginRight: '10px',
                padding: '8px 16px',
                backgroundColor: '#212c59',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
            <button 
              onClick={() => setError('')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Error
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-container" style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner"></div>
          <p>Loading rewards...</p>
        </div>
      )}

      {/* Stats */}
      {!loading && (
      <div
        className="stats-container"
        style={{
          display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 20,
          marginBottom: '1.5rem',
        }}
      >
        {REWARD_STATUS.map((status) => (
        <div
            key={status}
          className="stat-card"
          style={{
            background: '#fff',
            padding: '0.75rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            border: '1px solid #e9ecef',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
          }}
        >
          <div
            style={{
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              background: status === 'Active' ? '#e8f5e8' : 
                         status === 'Inactive' ? '#f5f5f5' : 
                         status === 'Scheduled' ? '#fff3cd' : '#f8d7da',
              color: status === 'Active' ? '#28a745' : 
                     status === 'Inactive' ? '#6c757d' : 
                     status === 'Scheduled' ? '#ffc107' : '#dc3545'
            }}
          >
              <Gift />
          </div>
          <div className="stat-info" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ 
                fontSize: '0.8rem',
                color: '#6c757d',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>{status}</div>
              <div style={{ 
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#212c59',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>{statusCounts[status]}</div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Search and Filters */}
      <div style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        marginBottom: '2rem',
        border: '1px solid #e9ecef',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '300px'
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
            placeholder="Search rewards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              fontSize: '0.9rem',
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
            { value: 'All', label: 'All Rewards' },
            ...REWARD_STATUS.map((status) => ({
              value: status,
              label: `${status} (${statusCounts[status]})`
            }))
          ]}
          value={filter}
          onChange={setFilter}
          minWidth="160px"
        />
      </div>

      {/* Professional Reward Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '4rem'
      }}>
        {/* Table Header */}
        <div style={{
          background: '#212c59',
          padding: '1.5rem 2rem',
          borderBottom: '2px solid #b08d57',
          display: 'grid',
          gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1.5fr 1fr',
          gap: '1rem',
          alignItems: 'center',
          fontWeight: '700',
          fontSize: '0.9rem',
          color: 'white',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdCardGiftcard style={{ color: '#b08d57', fontSize: '1rem' }} />
            REWARD
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdDescription style={{ color: '#b08d57', fontSize: '1rem' }} />
            DESCRIPTION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Gift style={{ color: '#b08d57', fontSize: '1rem' }} />
            TYPE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#b08d57' 
            }} />
            STATUS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MdDateRange style={{ color: '#b08d57', fontSize: '1rem' }} />
            DATES
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <FaCog style={{ color: '#b08d57', fontSize: '1rem' }} />
            ACTIONS
          </div>
        </div>

        {!loading && filteredRewards.length > 0 ? (
          filteredRewards.map((reward, index) => (
            <div
              key={reward._id}
              style={{
                padding: '1.5rem 2rem',
                borderBottom: index < filteredRewards.length - 1 ? '1px solid #f1f5f9' : 'none',
                display: 'grid',
                gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1.5fr 1fr',
                gap: '1rem',
                alignItems: 'center',
                transition: 'background-color 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* REWARD Column */}
              <div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '700',
                  color: '#212c59',
                  marginBottom: '0.25rem'
                }}>
                  {reward.title}
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: '#b08d57',
                  fontWeight: '700'
                }}>
                  {getRewardText(reward)}
                </div>
              </div>

              {/* DESCRIPTION Column */}
              <div style={{
                fontSize: '0.9rem',
                color: '#64748b',
                lineHeight: '1.4'
              }}>
                {reward.description}
              </div>

              {/* TYPE Column */}
              <div style={{
                fontSize: '0.9rem',
                color: '#212c59',
                fontWeight: '600'
              }}>
                {reward.rewardType}
              </div>

              {/* STATUS Column */}
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '20px',
                    background: reward.status === 'Active' ? '#d4edda' : 
                               reward.status === 'Inactive' ? '#f8d7da' :
                               reward.status === 'Scheduled' ? '#fff3cd' :
                               '#f8d7da',
                    color: reward.status === 'Active' ? '#155724' : 
                           reward.status === 'Inactive' ? '#721c24' :
                           reward.status === 'Scheduled' ? '#856404' :
                           '#721c24',
                    fontWeight: '600',
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                    border: reward.status === 'Active' ? '1px solid #c3e6cb' : 
                           reward.status === 'Inactive' ? '1px solid #f5c6cb' :
                           reward.status === 'Scheduled' ? '1px solid #ffeaa7' :
                           '1px solid #f5c6cb'
                  }}
                >
                  {reward.status}
                </span>
              </div>

              {/* DATES Column */}
              <div style={{
                fontSize: '0.85rem',
                color: '#6c757d',
                lineHeight: '1.4'
              }}>
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong style={{ color: '#212c59' }}>Start:</strong> {formatDate(reward.startDate)}
                </div>
                <div>
                  <strong style={{ color: '#212c59' }}>End:</strong> {formatDate(reward.endDate)}
                </div>
              </div>

              {/* ACTIONS Column */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  title="Edit reward"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(true);
                    setCurrentReward(reward);
                    setShowModal(true);
              setModalError('');
                  setModalError('');
                    setModalError('');
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    color: 'white',
                    background: '#212c59',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(33, 44, 89, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#1e3a8a';
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 8px rgba(33, 44, 89, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#212c59';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 2px 4px rgba(33, 44, 89, 0.3)';
                  }}
                >
                  <FaEdit />
                </button>
                <button
                  title={reward.status === 'Active' ? "Deactivate reward" : "Activate reward"}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(reward._id);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    color: 'white',
                    background: reward.status === 'Active' ? '#28a745' : '#6c757d',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem',
                    boxShadow: reward.status === 'Active' ? '0 2px 4px rgba(40, 167, 69, 0.3)' : '0 2px 4px rgba(108, 117, 125, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = reward.status === 'Active' ? '#218838' : '#5a6268';
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = reward.status === 'Active' ? '0 4px 8px rgba(40, 167, 69, 0.4)' : '0 4px 8px rgba(108, 117, 125, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = reward.status === 'Active' ? '#28a745' : '#6c757d';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = reward.status === 'Active' ? '0 2px 4px rgba(40, 167, 69, 0.3)' : '0 2px 4px rgba(108, 117, 125, 0.3)';
                  }}
                >
                  {reward.status === 'Active' ? <FaEye /> : <FaEyeSlash />}
                </button>
                <button
                  title="Delete reward"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(reward._id);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    color: 'white',
                    background: '#e74c3c',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(231, 76, 60, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#c0392b';
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 8px rgba(231, 76, 60, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#e74c3c';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 2px 4px rgba(231, 76, 60, 0.3)';
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        ) : !loading ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#212c59'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#b08d57',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              color: 'white',
              fontSize: '2rem',
              boxShadow: '0 4px 12px rgba(33, 44, 89, 0.2)'
            }}>
              <Gift />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#212c59',
              margin: '0 0 0.5rem 0'
            }}>
              {searchTerm || filter !== "All" 
                ? "No rewards match your search criteria" 
                : "No rewards available yet"}
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: '0 0 2rem 0',
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              {searchTerm || filter !== "All" 
                ? "Try adjusting your search or filter criteria to find rewards." 
                : "Create your first reward to start engaging customers and building loyalty."}
            </p>
            {(!searchTerm && filter === "All") && (
              <button
                onClick={() => {
                  setEditing(false);
                  setCurrentReward(null);
                  setShowModal(true);
              setModalError('');
                  setModalError('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#212c59',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 8px rgba(33, 44, 89, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1e3a8a';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 12px rgba(33, 44, 89, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#212c59';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 8px rgba(33, 44, 89, 0.3)';
                }}
              >
                <FaPlus />
                Create First Reward
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div
          style={{
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
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-out',
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideIn 0.3s ease-out',
              transform: 'scale(1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ 
              position: 'relative', 
              textAlign: 'center', 
              marginBottom: '20px',
              padding: '24px 28px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              borderRadius: '20px 20px 0 0',
              borderBottom: '2px solid rgba(33, 44, 89, 0.1)'
            }}>
              <h3 style={{ 
                margin: '0', 
                color: '#212c59', 
                fontSize: '1.5rem', 
                fontWeight: '700',
                fontFamily: "'Montserrat', sans-serif"
              }}>Confirm Delete</h3>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="modal-close-btn"
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '28px',
                  background: 'rgba(33, 44, 89, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: '#6c757d'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(33, 44, 89, 0.2)';
                  e.target.style.color = '#212c59';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(33, 44, 89, 0.1)';
                  e.target.style.color = '#6c757d';
                }}
              >
                ✕
              </button>
            </div>
            
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px' }}>
              Are you sure you want to delete this reward?
            </div>
            
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
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
                onClick={() => handleDeleteReward(showDeleteConfirm)}
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
                Delete Reward
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {!showModal && !showDeleteConfirm && (
        <div className="menu-actions">
        <button
            className="add-item-btn" 
            onClick={() => {
              setEditing(false);
              setCurrentReward(null);
              setShowModal(true);
              setModalError('');
            }}
          >
              <FaPlus /> Add New Reward
        </button>
      </div>
      )}

      {/* Modal */}
      <AddEditRewardModal
        show={showModal}
        onHide={() => {
          // Dispatch event to close all dropdowns
          document.dispatchEvent(new CustomEvent('modalClose'));
          setShowModal(false);
          setEditing(false);
          setCurrentReward(null);
          setModalError('');
        }}
        onSave={handleSaveReward}
        editing={editing}
        initialData={currentReward}
        modalError={modalError}
      />
    </div>
  );
};

export default RewardManagement;