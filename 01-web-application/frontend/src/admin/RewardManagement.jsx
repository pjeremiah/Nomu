import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaCog } from 'react-icons/fa';
import { Gift, Check, Loader2 } from 'lucide-react';
import { MdCardGiftcard, MdDescription, MdDateRange } from "react-icons/md";
import { Search } from "lucide-react";
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';
import { AdminStatCardsGrid, AdminStatCard, getPromoRewardStatusColors } from './components/AdminStatCards';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

// Convert API date (ISO string or Date) to datetime-local input value (local time, yyyy-MM-ddTHH:mm)
const toDatetimeLocal = (isoOrDate) => {
  if (isoOrDate == null || isoOrDate === '') return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AddEditRewardModal = ({ show, onHide, onSave, editing, initialData, modalError, saving }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title ?? '',
        description: initialData.description ?? '',
        rewardType: initialData.rewardType ?? REWARD_TYPES[0],
        pointsRequired: initialData.pointsRequired ?? '',
        startDate: toDatetimeLocal(initialData.startDate),
        endDate: toDatetimeLocal(initialData.endDate),
        usageLimit: initialData.usageLimit ?? '',
        status: initialData.status ?? 'Active'
      });
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

  if (!show) return null;

  return (
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
            padding: 10px 20px !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
            cursor: pointer !important;
            box-shadow: 0 2px 8px rgba(33, 44, 89, 0.1) !important;
            flex: 1 !important;
            font-size: 0.85rem !important;
          }
          .admin-modal .admin-btn-primary:hover {
            background: #212c59 !important;
            border-color: #212c59 !important;
            color: white !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(33, 44, 89, 0.3) !important;
          }
          
          /* Ensure all form elements have pearl background and consistent height */
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
          }
          
          /* Button alignment and sizing */
          .admin-modal .admin-form-actions {
            display: flex !important;
            gap: 12px !important;
            justify-content: center !important;
            margin-top: 4px !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          
          .admin-modal .admin-btn-primary,
          .admin-modal .admin-btn-secondary {
            flex: 0 0 auto !important;
            min-width: 0 !important;
            max-width: none !important;
            text-align: center !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: calc(50% - 40px) !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 8px 12px !important;
            font-size: 0.85rem !important;
          }
        `}
      </style>
      <div className="admin-modal" style={{
        background: '#f8f9fa',
        borderRadius: '16px',
        padding: '12px 6px',
        width: '100%',
        maxWidth: '550px',
        maxHeight: 'calc(100vh - 40px)',
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
          paddingTop: '8px'
        }}>
          <h3 style={{margin: 0, color: '#212c59', fontWeight: '700', textAlign: 'center', fontSize: '1rem'}}>
            {editing ? 'Edit Reward' : 'Add New Reward'}
          </h3>
        </div>
      <form className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#f8f9fa' }}>
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
          
          <div className="admin-form-group" style={{ marginBottom: '1px' }}>
            <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Reward Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="admin-form-input"
              placeholder="Enter reward title"
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
            {errors.title && <div className="error-message">{errors.title}</div>}
          </div>
          
          <div className="admin-form-group" style={{ marginBottom: '1px' }}>
            <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Description</label>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="admin-form-input"
              placeholder="Enter detailed reward description"
              rows={3}
              style={{ padding: '8px 12px', minHeight: '80px', border: '2px solid #e9ecef', borderRadius: '6px', fontSize: '0.8rem', backgroundColor: '#f8f9fa' }}
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
          </div>
          
          <div className="admin-form-row" style={{ marginBottom: '1px', display: 'flex', gap: '1px' }}>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Reward Type</label>
              <EnhancedDropdown
                options={REWARD_TYPES.map(type => ({ value: type, label: type }))}
                value={form.rewardType}
                onChange={(value) => setForm((p) => ({ ...p, rewardType: value }))}
                placeholder="Select reward type"
                width="100%"
              />
            </div>
            
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Status</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '2px solid #e9ecef',
                background: '#f8f9fa',
                height: '40px',
                minHeight: '50px',
                maxHeight: '50px',
                boxSizing: 'border-box',
                width: '100%'
              }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: form.status === 'Active' ? '#d4edda' : form.status === 'Inactive' ? '#f8d7da' : '#fff3cd',
                  color: form.status === 'Active' ? '#155724' : form.status === 'Inactive' ? '#721c24' : '#856404',
                  border: '1px solid rgba(0,0,0,0.08)'
                }}>{form.status}</span>
              </div>
            </div>
          </div>

          <div className="admin-form-row" style={{ marginBottom: '1px', display: 'flex', gap: '1px' }}>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>{getRewardLabel()}</label>
              <input
                type="number"
                required
                value={form.pointsRequired}
                onChange={(e) => setForm((p) => ({ ...p, pointsRequired: e.target.value }))}
                className="admin-form-input"
                placeholder="e.g. 5, 10, 15"
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
              {errors.pointsRequired && <div className="error-message">{errors.pointsRequired}</div>}
            </div>
            
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Usage Limit (per customer)</label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm((p) => ({ ...p, usageLimit: e.target.value }))}
                className="admin-form-input"
                placeholder="Leave empty for unlimited"
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
              {errors.usageLimit && <div className="error-message">{errors.usageLimit}</div>}
            </div>
          </div>

          <div className="admin-form-row" style={{ marginBottom: '0px', display: 'flex', gap: '1px' }}>
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Start Date & Time</label>
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                className="admin-form-input"
                style={{ 
                  padding: '8px 12px', 
                  height: '40px',
                  minHeight: '40px',
                  maxHeight: '40px',
                  minHeight: '28px',
                  maxHeight: '28px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box',
                  width: '100%',
                  backgroundColor: '#f8f9fa',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              />
              {errors.startDate && <div className="error-message">{errors.startDate}</div>}
            </div>
            
            <div className="admin-form-group" style={{ flex: 1 }}>
              <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>End Date & Time</label>
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                className="admin-form-input"
                style={{ 
                  padding: '8px 12px', 
                  height: '40px',
                  minHeight: '40px',
                  maxHeight: '40px',
                  minHeight: '28px',
                  maxHeight: '28px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box',
                  width: '100%',
                  backgroundColor: '#f8f9fa',
                  boxSizing: 'border-box',
                  width: '100%'
                }}
              />
              {errors.endDate && <div className="error-message">{errors.endDate}</div>}
            </div>
          </div>
          
      </form>
      
      <div className="admin-form-actions" style={{ 
        display: 'flex', 
        gap: '12px', 
        justifyContent: 'center', 
        marginTop: '4px',
        maxWidth: '100%',
        width: '100%',
        boxSizing: 'border-box'
      }}>
          <button
            type="button"
            onClick={() => {
              // Dispatch event to close all dropdowns
              document.dispatchEvent(new CustomEvent('modalClose'));
              onHide();
            }}
            className="admin-btn admin-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="admin-btn admin-btn-primary"
            disabled={saving}
            style={{ opacity: saving ? 0.9 : 1, cursor: saving ? 'wait' : 'pointer' }}
          >
            {saving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={18} style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
                {editing ? 'Saving...' : 'Adding...'}
              </span>
            ) : (
              editing ? "Save Changes" : "Add Reward"
            )}
          </button>
        </div>
      </div>
    </div>
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
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [isDeletingReward, setIsDeletingReward] = useState(false);
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (showModal || showDeleteConfirm || showAddSuccessModal || showEditSuccessModal || showDeleteSuccessModal) {
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
  }, [showModal, showDeleteConfirm, showAddSuccessModal, showEditSuccessModal, showDeleteSuccessModal]);


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

  // Staff: view-only access (no add/edit/delete/toggle)
  const isViewOnly = userRole === 'staff';

  const handleSaveReward = async (rewardData) => {
    setIsSavingReward(true);
    try {
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
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
      const wasEditing = editing;
      await fetchRewards();
      setShowModal(false);
      setEditing(false);
      setCurrentReward(null);
      setModalError('');
      setTimeout(() => (wasEditing ? setShowEditSuccessModal(true) : setShowAddSuccessModal(true)), 120);
      window.dispatchEvent(new CustomEvent('adminAction'));
    } catch (err) {
      console.error('Network error:', err);
      setModalError(`Network error: ${err.message}`);
    } finally {
      setIsSavingReward(false);
    }
  };

  const handleDeleteReward = async (rewardId) => {
    setIsDeletingReward(true);
    try {
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
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
      await fetchRewards();
      setShowDeleteConfirm(null);
      setTimeout(() => setShowDeleteSuccessModal(true), 120);
      window.dispatchEvent(new CustomEvent('adminAction'));
    } catch (err) {
      console.error('Delete error:', err);
      setError(`Error deleting reward: ${err.message}`);
    } finally {
      setIsDeletingReward(false);
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
    <div className="admin-page reward-management">
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes rewardSuccessSlideIn { from { opacity: 0; transform: scale(0.92) translateY(-16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
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

      {!loading && (
        <AdminStatCardsGrid variant="compact" count={4}>
          {REWARD_STATUS.map((status) => {
            const colors = getPromoRewardStatusColors(status);
            return (
              <AdminStatCard
                key={status}
                variant="compact"
                label={status}
                value={statusCounts[status]}
                icon={Gift}
                iconColor={colors.iconColor}
                iconBackground={colors.iconBackground}
              />
            );
          })}
        </AdminStatCardsGrid>
      )}

      {/* Search and Filters */}
      <div
        className="admin-filters-bar"
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          marginBottom: '2rem',
          border: '1px solid #e9ecef',
        }}
      >
        <div className="admin-search-field" style={{ position: 'relative' }}>
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
      <div className="admin-table-panel">
        <div className="admin-table-scroll">
          <div className="admin-data-table--reward">
        <div className="admin-table-header admin-table-header--reward">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <MdCardGiftcard style={{ color: '#b08d57', fontSize: '1rem' }} />
            REWARD
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <MdDescription style={{ color: '#b08d57', fontSize: '1rem' }} />
            DESCRIPTION
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <Gift style={{ color: '#b08d57', fontSize: '1rem' }} />
            TYPE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: '#b08d57' 
            }} />
            STATUS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <MdDateRange style={{ color: '#b08d57', fontSize: '1rem' }} />
            DATES
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
            <FaCog style={{ color: '#b08d57', fontSize: '1rem' }} />
            ACTIONS
          </div>
        </div>

        {!loading && filteredRewards.length > 0 ? (
          filteredRewards.map((reward, index) => (
            <div
              key={reward._id}
              className="admin-table-row admin-table-row--reward"
              style={{
                borderBottom: index < filteredRewards.length - 1 ? '1px solid #f1f5f9' : 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* REWARD Column */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
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
                lineHeight: '1.4',
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                {reward.description}
              </div>

              {/* TYPE Column */}
              <div style={{
                fontSize: '0.9rem',
                color: '#212c59',
                fontWeight: '600',
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                {reward.rewardType}
              </div>

              {/* STATUS Column */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
                <span
                  style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0.875rem',
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
                         '1px solid #f5c6cb',
                  lineHeight: '1',
                  height: '28px',
                  minWidth: '80px'
                  }}
                >
                  {reward.status}
                </span>
              </div>

              {/* DATES Column */}
              <div style={{
                fontSize: '0.85rem',
                color: '#6c757d',
                lineHeight: '1.4',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start'
              }}>
                <div style={{ marginBottom: '0.25rem' }}>
                  <strong style={{ color: '#212c59' }}>Start:</strong> {formatDate(reward.startDate)}
                </div>
                <div>
                  <strong style={{ color: '#212c59' }}>End:</strong> {formatDate(reward.endDate)}
                </div>
              </div>

              {/* ACTIONS Column - hidden for staff (view only) */}
              <div style={{
                display: 'flex',
                gap: '0.125rem',
                justifyContent: 'flex-start',
                width: '100%'
              }}>
                {!isViewOnly && (
                  <>
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
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    border: 'none',
                    color: 'white',
                    background: '#212c59',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    fontSize: '0.75rem',
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
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        border: 'none',
                        color: 'white',
                        background: reward.status === 'Active' ? '#28a745' : '#6c757d',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        fontSize: '0.75rem',
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
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        border: 'none',
                        color: 'white',
                        background: '#e74c3c',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        fontSize: '0.75rem',
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
                  </>
                )}
                {isViewOnly && <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>View only</span>}
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
              maxWidth: '550px', // STANDARDIZED WIDTH
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              {searchTerm || filter !== "All" 
                ? "Try adjusting your search or filter criteria to find rewards." 
                : "Create your first reward to start engaging customers and building loyalty."}
            </p>
            {(!searchTerm && filter === "All") && !isViewOnly && (
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
        </div>
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
          <style>
            {`
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
                font-size: 0.9rem !important;
              }
              .admin-modal .admin-btn-danger:hover:not(:disabled) {
                background: #dc3545 !important;
                border-color: #dc3545 !important;
                color: white !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
              }
              .admin-modal .admin-btn-danger:disabled {
                background: white !important;
                color: #dc3545 !important;
                border: 2px solid #dc3545 !important;
                cursor: wait !important;
                opacity: 1 !important;
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
              Are you sure you want to delete this reward?
            </div>
            
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="admin-btn admin-btn-secondary"
                disabled={isDeletingReward}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReward(showDeleteConfirm)}
                className="admin-btn admin-btn-danger"
                disabled={isDeletingReward}
              >
                {isDeletingReward ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={18} style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
                    Deleting...
                  </span>
                ) : (
                  'Delete Reward'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modals */}
      {showAddSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '15px', boxSizing: 'border-box' }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', animation: 'rewardSuccessSlideIn 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)' }}>
              <Check size={40} color="white" strokeWidth={2.5} />
            </div>
            <h2 style={{ color: '#212c59', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', lineHeight: 1.3 }}>Reward Added Successfully!</h2>
            <p style={{ color: '#5a6c7d', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', margin: '0 0 32px 0', lineHeight: 1.5 }}>The reward has been added.</p>
            <button type="button" onClick={() => setShowAddSuccessModal(false)} style={{ background: 'white', color: '#212c59', border: '2px solid #212c59', borderRadius: '12px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.background = '#212c59'; e.target.style.color = 'white'; e.target.style.borderColor = '#0d1220'; }} onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#212c59'; e.target.style.borderColor = '#212c59'; }}>Close</button>
          </div>
        </div>
      )}
      {showEditSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '15px', boxSizing: 'border-box' }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', animation: 'rewardSuccessSlideIn 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)' }}>
              <Check size={40} color="white" strokeWidth={2.5} />
            </div>
            <h2 style={{ color: '#212c59', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', lineHeight: 1.3 }}>Changes Saved Successfully!</h2>
            <p style={{ color: '#5a6c7d', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', margin: '0 0 32px 0', lineHeight: 1.5 }}>The reward has been updated.</p>
            <button type="button" onClick={() => setShowEditSuccessModal(false)} style={{ background: 'white', color: '#212c59', border: '2px solid #212c59', borderRadius: '12px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.background = '#212c59'; e.target.style.color = 'white'; e.target.style.borderColor = '#0d1220'; }} onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#212c59'; e.target.style.borderColor = '#212c59'; }}>Close</button>
          </div>
        </div>
      )}
      {showDeleteSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '15px', boxSizing: 'border-box' }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', animation: 'rewardSuccessSlideIn 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)' }}>
              <Check size={40} color="white" strokeWidth={2.5} />
            </div>
            <h2 style={{ color: '#212c59', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', lineHeight: 1.3 }}>Reward Deleted Successfully!</h2>
            <p style={{ color: '#5a6c7d', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', margin: '0 0 32px 0', lineHeight: 1.5 }}>The reward has been removed.</p>
            <button type="button" onClick={() => setShowDeleteSuccessModal(false)} style={{ background: 'white', color: '#212c59', border: '2px solid #212c59', borderRadius: '12px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.background = '#212c59'; e.target.style.color = 'white'; e.target.style.borderColor = '#0d1220'; }} onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#212c59'; e.target.style.borderColor = '#212c59'; }}>Close</button>
          </div>
        </div>
      )}

      {/* Floating Add Button - hidden for staff (view only) */}
      {!showModal && !showDeleteConfirm && !showAddSuccessModal && !showEditSuccessModal && !showDeleteSuccessModal && !isViewOnly && (
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
        saving={isSavingReward}
      />
    </div>
  );
};

export default RewardManagement;