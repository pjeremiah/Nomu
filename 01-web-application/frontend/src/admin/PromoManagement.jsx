import React, { useState, useEffect, useMemo } from "react";
import { FaEdit, FaTrash, FaPlus, FaCalendarAlt, FaTag, FaClock, FaCheck, FaTimes, FaEye, FaEyeSlash, FaSpinner, FaCog } from "react-icons/fa";
import { Star, Search } from "lucide-react";
import { BsGift } from "react-icons/bs";
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

const PROMO_TYPES = ["Percentage Discount", "Fixed Amount Discount", "Buy One Get One", "Free Item", "Loyalty Points Bonus"];
const PROMO_STATUS = ["Active", "Inactive"];

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

  return (
    <ResponsiveModal
      show={show}
      onHide={onHide}
      title={editing ? 'Edit Promo' : 'Add New Promo'}
      size="large"
    >
      <form className="admin-form" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Error Display inside Add/Edit Modal */}
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
            
            <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
              <label className="admin-form-label" style={{ marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>Promo Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="admin-form-input"
                placeholder="Enter promo title"
                style={{ 
                  padding: '0.75rem 1rem', 
                  height: '45px',
                  fontSize: '0.9rem',
                  border: errors.title ? '2px solid #dc3545' : '1px solid #e9ecef',
                  borderRadius: '8px',
                  width: '100%',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </div>
            
            <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="admin-form-input"
                placeholder="Enter detailed promo description"
                rows={1}
                style={{ 
                  padding: '0.4rem 0.6rem', 
                  minHeight: '50px',
                  border: errors.description ? '2px solid #dc3545' : '1px solid #e9ecef',
                  borderRadius: '8px',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </div>
            
            <div className="admin-form-row" style={{ marginBottom: '0.25rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Promo Type</label>
                <EnhancedDropdown
                  options={PROMO_TYPES.map(type => ({ value: type, label: type }))}
                  value={form.promoType}
                  onChange={(value) => {
                    setForm((p) => ({ 
                      ...p, 
                      promoType: value,
                      // Clear discount value when switching to "Free Item"
                      discountValue: value === "Free Item" ? "" : p.discountValue
                    }));
                    // Clear discount value error when switching promo types
                    if (errors.discountValue) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.discountValue;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="Select promo type"
                  width="100%"
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Status</label>
                <EnhancedDropdown
                  options={PROMO_STATUS.map(status => ({ value: status, label: status }))}
                  value={form.status}
                  onChange={(value) => setForm((p) => ({ ...p, status: value }))}
                  placeholder="Select status"
                  width="100%"
                />
              </div>
            </div>

            {/* Only show discount value field if promo type is not "Free Item" */}
            {form.promoType !== "Free Item" && (
              <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
                <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>{getDiscountLabel()}</label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                  className="admin-form-input"
                  placeholder="Enter value"
                  style={{ 
                    padding: '0.4rem 0.6rem', 
                    height: '40px',
                    lineHeight: '1.5',
                    verticalAlign: 'middle',
                    border: errors.discountValue ? '2px solid #dc3545' : '1px solid #e9ecef',
                    borderRadius: '8px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>
            )}

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
              </div>
            </div>
            
            <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
              <label className="admin-form-label" style={{ marginBottom: '0.1rem' }}>Promo Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="admin-form-input"
                style={{ 
                  padding: '0.4rem 0.6rem', 
                  height: '40px',
                  lineHeight: '1.5',
                  verticalAlign: 'middle',
                  fontSize: '0.85rem',
                  maxWidth: '900px'
                }}
              />
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
            {editing ? "Save Changes" : "Add Promo"}
          </button>
        </div>
    </ResponsiveModal>
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

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    if (showModal || showDeleteConfirm) {
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
      color: '#212c59',
      minHeight: '100vh',
      background: '#f8f9fa'
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

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {PROMO_STATUS.map((status) => (
          <div
            key={status}
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
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
            <div style={{
              fontSize: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
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
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#6c757d',
                fontWeight: '500',
                marginBottom: '0.25rem'
              }}>
                {status}
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#212c59',
                display: 'flex',
                alignItems: 'center',
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
          borderRadius: '12px',
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
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
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
                    gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
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
                          fontSize: '0.85rem',
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
                      fontSize: '0.9rem',
                      color: '#212c59',
                      fontWeight: '600',
                      marginBottom: '0.25rem'
                    }}>
                      {promo.promoType}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
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
                        gap: '0.375rem',
                        padding: '0.375rem 0.75rem',
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
                               '1px solid #f5c6cb'
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
                    fontSize: '0.85rem',
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

                  {/* ACTIONS Column */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    justifyContent: 'flex-end'
                  }}>
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
                maxWidth: '400px',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                {searchTerm || filter !== "All" 
                  ? "Try adjusting your search or filter criteria to find promotional offers." 
                  : "Create your first promotional offer to start engaging customers and driving sales."}
              </p>
              {(!searchTerm && filter === "All") && (
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
              Are you sure you want to delete this promo?
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
                onClick={() => handleDeletePromo(showDeleteConfirm)}
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
                Delete Promo
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