import React, { useState, useEffect, useMemo } from "react";
import { FaEdit, FaTrash, FaPlus, FaCalendarAlt, FaTag, FaClock, FaCheck, FaTimes, FaEye, FaEyeSlash, FaSpinner, FaCog } from "react-icons/fa";
import { Star, Search } from "lucide-react";
import { BsGift } from "react-icons/bs";
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const PROMO_TYPES = ["Percentage Discount", "Fixed Amount Discount", "Buy One Get One", "Free Item", "Loyalty Points Bonus"];
const PROMO_STATUS = ["Active", "Inactive", "Scheduled", "Expired"];

const emptyForm = { 
  title: "", 
  description: "", 
  promoType: PROMO_TYPES[0], 
  discountValue: "", 
  startDate: "",
  endDate: "",
  status: "Active",
  image: null 
};

const AddEditPromoModal = ({ show, onHide, onSave, editing, initialData, modalError }) => {
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

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    setForm((prev) => ({ ...prev, image: file || null }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.title.trim()) newErrors.title = "Please fill up all blanks";
    if (!form.description.trim()) newErrors.description = "Please fill up all blanks";
    
    // Only validate discount value if promo type is not "Free Item"
    if (form.promoType !== "Free Item") {
      if (!form.discountValue || form.discountValue <= 0) {
        newErrors.discountValue = "Please enter a valid discount value";
      }
    }
    
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

  const getDiscountLabel = () => {
    switch (form.promoType) {
      case "Percentage Discount":
        return "Discount Percentage (%)";
      case "Fixed Amount Discount":
        return "Discount Amount (₱)";
      case "Buy One Get One":
        return "Buy X Get Y (e.g., 1 for 1)";
      case "Free Item":
        return "Free Item Value (₱)";
      case "Loyalty Points Bonus":
        return "Bonus Points Multiplier";
      default:
        return "Value";
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
        `}
      </style>
      <div className="admin-modal" style={{
        background: 'white',
        borderRadius: '16px',
        padding: '20px',
        width: '100%',
        maxWidth: '550px',
        maxHeight: 'calc(100vh - 20px)',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '8px',
          paddingBottom: '6px',
          borderBottom: '1px solid #e9ecef'
        }}>
          <h3 style={{margin: 0, color: '#212c59', fontWeight: '700', textAlign: 'center', fontSize: '1rem'}}>
            {editing ? 'Edit Promotion' : 'Create New Promotion'}
          </h3>
        </div>
      {/* Error Display */}
      {modalError && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 16px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          color: '#721c24',
          fontSize: '0.875rem',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          {modalError}
        </div>
      )}

             <form style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Promo Title */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '2px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#212c59'
              }}>
                Promotion Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Enter promotion title"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: errors.title ? '2px solid #dc3545' : '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#212c59';
                  e.target.style.boxShadow = '0 0 0 3px rgba(33, 44, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.title ? '#dc3545' : '#e9ecef';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.title && (
                <p style={{ color: '#dc3545', fontSize: '0.8rem', margin: '4px 0 0' }}>{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '2px',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#212c59'
              }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Enter detailed promotion description"
                 rows={1}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  border: errors.description ? '2px solid #dc3545' : '2px solid #e9ecef',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#ffffff',
                  resize: 'vertical',
                  minHeight: '80px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#212c59';
                  e.target.style.boxShadow = '0 0 0 3px rgba(33, 44, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.description ? '#dc3545' : '#e9ecef';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {errors.description && (
                <p style={{ color: '#dc3545', fontSize: '0.8rem', margin: '4px 0 0' }}>{errors.description}</p>
              )}
            </div>

            {/* Promo Type and Status Row */}
             <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#212c59'
                }}>
                  Promotion Type
                </label>
                <EnhancedDropdown
                  options={PROMO_TYPES.map(type => ({ value: type, label: type }))}
                  value={form.promoType}
                  onChange={(value) => {
                    setForm((p) => ({ 
                      ...p, 
                      promoType: value,
                      discountValue: value === "Free Item" ? "" : p.discountValue
                    }));
                    if (errors.discountValue) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.discountValue;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Select promotion type"
                  width="100%"
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#212c59'
                }}>
                  Status
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 12px',
                  borderRadius: '8px',
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
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: form.status === 'Active' ? '#d4edda' : form.status === 'Inactive' ? '#f8d7da' : '#fff3cd',
                    color: form.status === 'Active' ? '#155724' : form.status === 'Inactive' ? '#721c24' : '#856404',
                    border: '1px solid rgba(0,0,0,0.08)'
                  }}>{form.status}</span>
                </div>
              </div>
            </div>

            {/* Discount Value - Only show if not "Free Item" */}
            {form.promoType !== "Free Item" && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#212c59'
                }}>
                  {getDiscountLabel()}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                  placeholder="Enter value"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: errors.discountValue ? '2px solid #dc3545' : '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#212c59';
                    e.target.style.boxShadow = '0 0 0 3px rgba(33, 44, 89, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.discountValue ? '#dc3545' : '#e9ecef';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.discountValue && (
                  <p style={{ color: '#dc3545', fontSize: '0.8rem', margin: '4px 0 0' }}>{errors.discountValue}</p>
                )}
              </div>
            )}

            {/* Date Range Row */}
             <div style={{ display: 'flex', gap: '4px' }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#212c59'
                }}>
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#212c59';
                    e.target.style.boxShadow = '0 0 0 3px rgba(33, 44, 89, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e9ecef';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#212c59'
                }}>
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: errors.endDate ? '2px solid #dc3545' : '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#212c59';
                    e.target.style.boxShadow = '0 0 0 3px rgba(33, 44, 89, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.endDate ? '#dc3545' : '#e9ecef';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.endDate && (
                  <p style={{ color: '#dc3545', fontSize: '0.8rem', margin: '4px 0 0' }}>{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Promo Image - Styled Upload */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '3px',
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#212c59'
              }}>
                Promotion Image
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                marginBottom: '6px'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  style={{
                    display: 'none'
                  }}
                  id="promo-image-upload"
                />
                <label htmlFor="promo-image-upload" style={{
                  background: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: '#212c59',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e9ecef';
                  e.target.style.borderColor = '#212c59';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f8f9fa';
                  e.target.style.borderColor = '#e9ecef';
                }}>
                  Choose File
                </label>
                <div style={{
                  background: '#f8f9fa',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                  color: '#6c757d',
                  flex: 1,
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: 0
                }}>
                  {form.image ? form.image.name : 'No file chosen'}
                </div>
              </div>
            </div>
          </form>
          
           <div className="admin-form-actions" style={{
             display: 'flex',
             gap: '10px',
             justifyContent: 'flex-end',
             marginTop: '4px'
           }}>
            <button
              type="button"
              onClick={() => {
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
            >
              {editing ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
      </div>
    </div>
  );
};

const PromoManagement = () => {
  const [promos, setPromos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [currentPromo, setCurrentPromo] = useState(null);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Prevent body scrolling when modal is open
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

  // Fetch promos from API
  const fetchPromos = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/api/promos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPromos(data);
      } else {
        let errorMessage = 'Failed to fetch promos';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        console.error('API Error:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (userRole === 'superadmin' || userRole === 'manager' || userRole === 'staff')) {
      fetchPromos();
    }
  }, [isAuthenticated, userRole]);

  // Staff: view-only access (no add/edit/delete/toggle)
  const isViewOnly = userRole === 'staff';

  const handleSavePromo = async (promoData) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setError('No authentication token found');
        setLoading(false);
        return;
      }

      
      const formData = new FormData();
      formData.append('title', promoData.title);
      formData.append('description', promoData.description);
      formData.append('promoType', promoData.promoType);
      formData.append('discountValue', promoData.discountValue);
      formData.append('startDate', promoData.startDate);
      formData.append('endDate', promoData.endDate);
      formData.append('status', promoData.status);
      
      if (promoData.image) {
        formData.append('image', promoData.image);
      }

      const url = editing ? `${API_BASE}/api/promos/${currentPromo._id}` : `${API_BASE}/api/promos`;
      const method = editing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        await response.json();
        await fetchPromos(); // Refresh the list
        setShowModal(false);
        setEditing(false);
        setCurrentPromo(null);
        
        // Trigger activity refresh
        window.dispatchEvent(new CustomEvent('adminAction'));
      } else {
        let errorMessage = 'Failed to save promo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('API Error:', errorData);
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        setModalError(errorMessage);
      }
    } catch (err) {
      console.error('Network error:', err);
      setModalError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromo = async (promoId) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/promos/${promoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchPromos(); // Refresh the list
        setShowDeleteConfirm(null);
        
        // Trigger activity refresh
        window.dispatchEvent(new CustomEvent('adminAction'));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete promo');
      }
    } catch (err) {
      setError('Error deleting promo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (promoId) => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const response = await fetch(`${API_BASE}/api/promos/${promoId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchPromos(); // Refresh the list
        
        // Trigger activity refresh
        window.dispatchEvent(new CustomEvent('adminAction'));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to toggle promo status');
      }
    } catch (err) {
      setError('Error toggling promo status');
    } finally {
      setLoading(false);
    }
  };

  const filteredPromos = useMemo(() => {
    let filtered = promos;
    
    if (filter !== "All") {
      filtered = filtered.filter(promo => promo.status === filter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(promo => 
        promo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [promos, filter, searchTerm]);

  const getStatusCounts = () => {
    return PROMO_STATUS.reduce((acc, status) => {
      acc[status] = promos.filter(p => p.status === status).length;
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

  const getDiscountText = (promo) => {
    switch (promo.promoType) {
      case "Percentage Discount":
        return `${promo.discountValue}% off`;
      case "Fixed Amount Discount":
        return `₱${promo.discountValue} off`;
      case "Buy One Get One":
        return "BOGO";
      case "Free Item":
        return `Free item (₱${promo.discountValue} value)`;
      case "Loyalty Points Bonus":
        return `${promo.discountValue}x points`;
      default:
        return promo.discountValue;
    }
  };

  // Show authentication required message if not logged in as admin
  if (!isAuthenticated) {
    return (
      <div className="reward-management" style={{ padding: '2rem' }}>
        <div className="page-header" style={{ marginBottom: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a' }}>
            PROMO MANAGEMENT
          </h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
          <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>Authentication Required</h3>
          <p>You need to be logged in as an admin to access Promo Management.</p>
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
            PROMO MANAGEMENT
          </h1>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '1rem 0' }}>
          <h3 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h3>
          <p>You don't have permission to access Promo Management.</p>
          <p>Admin privileges are required.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      fontFamily: "'Montserrat', sans-serif",
      color: '#212c59'
    }}>
      {/* Page Header */}
      <PageHeader 
        title="Promo Management" 
        icon={Star}
      />

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

      {/* Stats - one row like Reward Management */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        padding: '0 4px'
      }}>
        {PROMO_STATUS.map((status) => (
          <div
            key={status}
            style={{
              background: '#fff',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              border: '1px solid #e9ecef',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              cursor: 'pointer',
              minWidth: '120px',
              flex: '1'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
            }}
          >
            <div style={{
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              background: status === 'Active' ? '#e8f5e8' : 
                         status === 'Inactive' ? '#f8f9fa' :
                         status === 'Scheduled' ? '#fff3e0' :
                         '#ffebee',
              color: status === 'Active' ? '#2e7d32' : 
                     status === 'Inactive' ? '#6c757d' :
                     status === 'Scheduled' ? '#f57c00' :
                     '#d32f2f'
            }}>
              <BsGift />
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontSize: '0.8rem',
                color: '#6c757d',
                fontWeight: '500',
                marginBottom: '0.5rem'
              }}>
                {status}
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#212c59',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                {loading ? (
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  statusCounts[status]
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="search-filter-container" style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        border: '1px solid #e9ecef',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        flexWrap: 'wrap'
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
            placeholder="Search promos..."
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
            { value: 'All', label: 'All Promos' },
            ...PROMO_STATUS.map((status) => ({
              value: status,
              label: `${status} (${statusCounts[status]})`
            }))
          ]}
          value={filter}
          onChange={setFilter}
          minWidth="160px"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          color: '#6c757d',
          fontSize: '1rem'
        }}>
          <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
          Loading promos...
        </div>
      )}

      {/* Professional Promo Table */}
      {!loading && (
        <div style={{
          background: '#ffffff',
                  borderRadius: '8px', // SLIGHT CURVE LIKE ADD NEW PROMO
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          marginBottom: '4rem'
        }}>
          {filteredPromos.length > 0 ? (
            <>
              {/* Table Header */}
              <div style={{
                background: '#212c59',
                padding: '1.5rem 2rem',
                borderBottom: '2px solid #b08d57',
                display: 'grid',
                gridTemplateColumns: 'minmax(200px, 2fr) minmax(150px, 1.5fr) minmax(120px, 1fr) minmax(150px, 1fr) minmax(120px, 1fr)',
                gap: '1rem',
                alignItems: 'center',
                fontWeight: '700',
                fontSize: '0.9rem',
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BsGift style={{ color: '#b08d57', fontSize: '1rem' }} />
                  PROMOTION
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaTag style={{ color: '#b08d57', fontSize: '1rem' }} />
                  TYPE & DISCOUNT
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
                  <FaCalendarAlt style={{ color: '#b08d57', fontSize: '1rem' }} />
                  VALIDITY
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
                  <FaCog style={{ color: '#b08d57', fontSize: '1rem' }} />
                  ACTIONS
                </div>
              </div>

              {/* Table Rows */}
              {filteredPromos.map((promo, index) => (
                <div
                  key={promo._id}
                  style={{
                    padding: '1.5rem 2rem',
                    borderBottom: index < filteredPromos.length - 1 ? '1px solid #f1f5f9' : 'none',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(200px, 2fr) minmax(150px, 1.5fr) minmax(120px, 1fr) minmax(150px, 1fr) minmax(120px, 1fr)',
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
                  {/* PROMOTION Column */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      {promo.imageUrl && (
                        <img 
                          src={`${API_BASE}${promo.imageUrl}`} 
                          alt={promo.title}
                          style={{ 
                            width: '50px', 
                            height: '50px', 
                            objectFit: 'cover', 
                            borderRadius: '8px',
                            border: '2px solid #b08d57'
                          }}
                        />
                      )}
                      <div>
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#212c59',
                          marginBottom: '0.25rem'
                        }}>
                          {promo.title}
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#64748b',
                          fontWeight: '500',
                          lineHeight: '1.4'
                        }}>
                          {promo.description}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TYPE & DISCOUNT Column */}
                  <div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#212c59',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}>
                      {promo.promoType}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#b08d57',
                      fontWeight: '700'
                    }}>
                      {getDiscountText(promo)}
                    </div>
                  </div>

                  {/* STATUS Column */}
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.375rem',
                        padding: '0.5rem 0.875rem',
                        borderRadius: '20px',
                        background: promo.status === 'Active' ? '#d4edda' : 
                                   promo.status === 'Inactive' ? '#f8d7da' :
                                   promo.status === 'Scheduled' ? '#fff3cd' :
                                   '#f8d7da',
                        color: promo.status === 'Active' ? '#155724' : 
                               promo.status === 'Inactive' ? '#721c24' :
                               promo.status === 'Scheduled' ? '#856404' :
                               '#721c24',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em',
                        border: promo.status === 'Active' ? '1px solid #c3e6cb' : 
                               promo.status === 'Inactive' ? '1px solid #f5c6cb' :
                               promo.status === 'Scheduled' ? '1px solid #ffeaa7' :
                               '1px solid #f5c6cb',
                        lineHeight: '1',
                        height: '28px',
                        minWidth: '80px'
                      }}
                    >
                      {promo.status === 'Active' ? <FaCheck /> : 
                       promo.status === 'Inactive' ? <FaTimes /> :
                       promo.status === 'Scheduled' ? <FaClock /> :
                       <FaTimes />} {promo.status}
                    </span>
                  </div>

                  {/* VALIDITY Column */}
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong style={{ color: '#212c59' }}>Start:</strong> {formatDate(promo.startDate)}
                    </div>
                    <div>
                      <strong style={{ color: '#212c59' }}>End:</strong> {formatDate(promo.endDate)}
                    </div>
                  </div>

                  {/* ACTIONS Column - hidden for staff (view only) */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-start'
                  }}>
                    {!isViewOnly ? (
                      <>
                        <button
                          title="Edit promotion"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(true);
                            setCurrentPromo(promo);
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
                            background: '#212947',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            fontSize: '0.875rem',
                            boxShadow: '0 2px 4px rgba(33, 41, 71, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#1a2332';
                            e.target.style.transform = 'scale(1.1)';
                            e.target.style.boxShadow = '0 4px 8px rgba(33, 41, 71, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#212947';
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = '0 2px 4px rgba(33, 41, 71, 0.3)';
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          title={promo.status === 'Active' ? "Deactivate promotion" : "Activate promotion"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(promo._id);
                          }}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: 'none',
                            color: 'white',
                            background: promo.status === 'Active' ? '#28a745' : '#6c757d',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            fontSize: '0.875rem',
                            boxShadow: promo.status === 'Active' ? '0 2px 4px rgba(40, 167, 69, 0.3)' : '0 2px 4px rgba(108, 117, 125, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = promo.status === 'Active' ? '#218838' : '#5a6268';
                            e.target.style.transform = 'scale(1.05)';
                            e.target.style.boxShadow = promo.status === 'Active' ? '0 4px 8px rgba(40, 167, 69, 0.4)' : '0 4px 8px rgba(108, 117, 125, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = promo.status === 'Active' ? '#28a745' : '#6c757d';
                            e.target.style.transform = 'scale(1)';
                            e.target.style.boxShadow = promo.status === 'Active' ? '0 2px 4px rgba(40, 167, 69, 0.3)' : '0 2px 4px rgba(108, 117, 125, 0.3)';
                          }}
                        >
                          {promo.status === 'Active' ? <FaEye /> : <FaEyeSlash />}
                        </button>
                        <button
                          title="Delete promotion"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(promo._id);
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
                      </>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>View only</span>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
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
                <BsGift />
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#212c59',
                margin: '0 0 0.5rem 0'
              }}>
                {searchTerm || filter !== "All" 
                  ? "No promotions match your search criteria" 
                  : "No promotional offers yet"}
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
                  ? "Try adjusting your search or filter criteria to find promotional offers." 
                  : "Create your first promotional offer to start engaging customers and driving sales."}
              </p>
              {(!searchTerm && filter === "All") && !isViewOnly && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setCurrentPromo(null);
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
                    fontSize: '0.8rem',
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
                  Create First Promotion
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
                padding: 10px 20px !important;
                font-weight: 600 !important;
                transition: all 0.3s ease !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(220, 53, 69, 0.1) !important;
                flex: 1 !important;
                font-size: 0.95rem !important;
              }
              .admin-modal .admin-btn-danger:hover {
                background: #dc3545 !important;
                border-color: #dc3545 !important;
                color: white !important;
                transform: translateY(-2px) !important;
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
                fontFamily: "'Montserrat', sans-serif",
                textAlign: 'center'
              }}>Confirm Delete</h3>
            </div>
            
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px' }}>
              Are you sure you want to delete this promo?
            </div>
            
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePromo(showDeleteConfirm)}
                className="admin-btn admin-btn-danger"
              >
                Delete Promo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button - hidden for staff (view only) */}
      {!showModal && !showDeleteConfirm && !isViewOnly && (
        <div className="menu-actions">
          <button 
            className="add-item-btn" 
            onClick={() => {
              setEditing(false);
              setCurrentPromo(null);
              setShowModal(true);
              setModalError('');
            }}
          >
            <FaPlus /> Add New Promo
          </button>
        </div>
      )}

      {/* Modal */}
      <AddEditPromoModal
        show={showModal}
        onHide={() => {
          // Dispatch event to close all dropdowns
          document.dispatchEvent(new CustomEvent('modalClose'));
          setShowModal(false);
          setEditing(false);
          setCurrentPromo(null);
          setModalError('');
        }}
        onSave={handleSavePromo}
        editing={editing}
        initialData={currentPromo}
        modalError={modalError}
      />
    </div>
  );
};

export default PromoManagement;