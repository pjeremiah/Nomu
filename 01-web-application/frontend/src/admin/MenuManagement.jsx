import React, { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Coffee } from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

const emptyForm = { name: '', description: '', price: '', secondPrice: '', category: 'Donuts', image: null };

const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Donuts');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'disabled'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const { showLogoutConfirm } = useModalContext();

  // Add Modal State
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);

  // Edit Modal State
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState(emptyForm);

  // Delete Modal State
  const [showDelete, setShowDelete] = useState(false);
  const [deleteId, setDeleteId] = useState('');

  // Check user role for access control
  const [currentUser, setCurrentUser] = useState(null);

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    if (showAdd || showEdit || showDelete) {
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
  }, [showAdd, showEdit, showDelete]);

  useEffect(() => {
    // Fetch current user info
      const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setCurrentUser(userData);
          }
        }
      } catch (error) {

      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

  // All hooks must be called before any conditional returns
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => item.category === activeCategory);
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    return filtered;
  }, [items, activeCategory, statusFilter]);

  // Categories variable removed as it's not being used

  // Additional security check - prevent staff from accessing this component
  if (currentUser?.role === 'staff') {
    return (
      <div className="access-denied-container">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>Staff members cannot access the Menu Management section.</p>
          <p>This section requires Manager or Owner privileges.</p>
        </div>
      </div>
    );
  }

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/menu`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();

        setItems(data);
      } else {
        setError('Failed to fetch menu items');
      }
    } catch (err) {
      setError('Error fetching menu items');
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = (url) => (url ? `${API_BASE}${url}` : '');

  const handleFile = (e, setForm) => {
    const file = e.target.files && e.target.files[0];
    setForm(prev => ({ ...prev, image: file || null }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!addForm.name.trim()) {
      setModalError('Please fill up all blanks');
      return;
    }
    
    if (!addForm.description.trim()) {
      setModalError('Please fill up all blanks');
      return;
    }
    
    if (!addForm.price || addForm.price <= 0) {
      setModalError('Please enter a valid price');
      return;
    }
    
    // Validate second price only if provided
    if (addForm.secondPrice && addForm.secondPrice <= 0) {
      setModalError('Please enter a valid second price');
      return;
    }
    
    const fd = new FormData();
    fd.append('name', addForm.name);
    fd.append('price', addForm.price);
    fd.append('description', addForm.description);
    fd.append('category', addForm.category);
    // Always send secondPrice for all categories, even if empty
    fd.append('secondPrice', addForm.secondPrice || '');
    if (addForm.image) fd.append('image', addForm.image);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/menu`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });
      if (response.ok) {
        setShowAdd(false);
        setAddForm(emptyForm);
        await fetchItems();
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'menu_added', item: addForm.name } 
        }));
      } else {
        const errorData = await response.json();
        setModalError(errorData.message || 'Failed to add item');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to add item');
    }
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setEditForm({ 
      name: item.name, 
      description: item.description || '', 
      price: item.price, 
      secondPrice: item.secondPrice || '', 
      category: item.category, 
      image: null 
    });
    setModalError(''); // Clear any previous errors
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!editForm.name.trim()) {
      setModalError('Please fill up all blanks');
      return;
    }
    
    if (!editForm.description.trim()) {
      setModalError('Please fill up all blanks');
      return;
    }
    
    if (!editForm.price || editForm.price <= 0) {
      setModalError('Please enter a valid price');
      return;
    }
    
    // Validate second price only if provided
    if (editForm.secondPrice && editForm.secondPrice <= 0) {
      setModalError('Please enter a valid second price');
      return;
    }
    
    const fd = new FormData();
    fd.append('name', editForm.name);
    fd.append('price', editForm.price);
    fd.append('description', editForm.description);
    fd.append('category', editForm.category);
    // Always send secondPrice for all categories, even if empty (to clear it)
    fd.append('secondPrice', editForm.secondPrice || '');
    if (editForm.image) fd.append('image', editForm.image);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/menu/${editId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });
      if (response.ok) {
        setShowEdit(false);
        setEditId('');
        setEditForm(emptyForm);
        await fetchItems();
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'menu_updated', item: editForm.name } 
        }));
      } else {
        const errorData = await response.json();
        setModalError(errorData.message || 'Failed to update item');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update item');
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/menu/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setShowDelete(false);
        setDeleteId('');
        await fetchItems();
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'menu_deleted' } 
        }));
      } else {
        const errorData = await response.json();
        setModalError(errorData.message || 'Failed to delete item');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to delete item');
    }
  };

  const handleToggleStatus = async (itemId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/menu/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        await fetchItems();
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'menu_status_changed', status: newStatus } 
        }));
      } else {
        const errorData = await response.json();
        alert(`Failed to toggle status\n${errorData.message || 'Unknown error'}`);
      }
    } catch (err) {

      alert(`Failed to toggle status\n${err.message || 'Unknown error'}`);
    }
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
        title="Menu Management" 
        icon={Coffee}     
      />

      <div className="search-filter-container" style={{
        background: '#fff',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        marginBottom: '1.5rem'
      }}>
        {/* Top row with categories and dropdown */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0',
          width: '100%'
        }}>
          {/* Categories on the left */}
          <div className="categories-scroll" style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '0',
            flexWrap: 'nowrap',
            flex: '0 0 auto'
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Spacer to push dropdown to the right */}
          <div style={{ flex: '1' }}></div>

          {/* Dropdown on the right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: '0 0 auto'
          }}>
            <EnhancedDropdown
              options={[
                { value: 'all', label: 'All Items' },
                { value: 'active', label: 'Active Only' },
                { value: 'disabled', label: 'Disabled Only' }
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              minWidth="140px"
            />
          </div>
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
        {!loading && filteredItems.map(item => (
          <div key={item._id} className={`menu-item ${item.status === 'disabled' ? 'disabled' : ''}`}>
            <div className="menu-item-image">
              {item.imageUrl ? (
                <img 
                  src={imageUrl(item.imageUrl)} 
                  alt={item.name}
                  onLoad={() => {}}
                  onError={() => {}}
                />
              ) : (
                <img className="placeholder-image" src={''} alt={item.name} />
              )}
              <div className="menu-item-actions">
                <button 
                  className="action-icon edit" 
                  onClick={() => openEdit(item)}
                  title="Edit Item"
                >
                  <FaEdit />
                </button>
                <button 
                  className="action-icon delete" 
                  onClick={() => { setDeleteId(item._id); setShowDelete(true); }}
                  title="Delete Item"
                >
                  <FaTrash />
                </button>
                <button 
                  className={`action-icon status ${item.status === 'active' ? 'active' : 'disabled'}`}
                  onClick={() => handleToggleStatus(item._id, item.status)}
                  title={item.status === 'active' ? 'Disable Item' : 'Enable Item'}
                >
                  {item.status === 'active' ? <FaEye /> : <FaEyeSlash />}
                </button>
              </div>
            </div>
            <div className="menu-item-details">
              <h3>{item.name}</h3>
              <div className="menu-item-meta">
                <div className="price">
                  {item.secondPrice 
                    ? `₱${parseInt(item.price).toLocaleString()}/${parseInt(item.secondPrice).toLocaleString()}`
                    : `₱${parseInt(item.price).toLocaleString()}`
                  }
                </div>
                <div className={`status-badge ${item.status === 'active' ? 'active' : 'disabled'}`}>
                  {item.status === 'active' ? 'Active' : 'Disabled'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-out',
            padding: '15px',
            boxSizing: 'border-box'
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
              .admin-form-group {
                margin-bottom: 6px !important;
                width: 100% !important;
              }
              .admin-form-label {
                font-size: 0.8rem !important;
                margin-bottom: 3px !important;
                font-weight: 600 !important;
                color: #212c59 !important;
                display: block !important;
                width: 100% !important;
              }
              .admin-form-input {
                padding: 8px 10px !important;
                height: 36px !important;
                min-height: 36px !important;
                max-height: 36px !important;
                font-size: 0.8rem !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                background: #f8f9fa !important;
                width: 100% !important;
                box-sizing: border-box !important;
              }
              .admin-form-input[type="textarea"], textarea.admin-form-input {
                height: 70px !important;
                min-height: 70px !important;
                max-height: 70px !important;
                resize: none !important;
                padding: 8px 10px !important;
              }
              .admin-form-input[type="file"] {
                display: none !important;
              }
              .file-upload-container {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                width: 100% !important;
                margin-bottom: 6px !important;
              }
              .file-upload-button {
                background: #f8f9fa !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
                font-size: 0.8rem !important;
                color: #212c59 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                white-space: nowrap !important;
                height: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .file-upload-button:hover {
                background: #e9ecef !important;
                border-color: #212c59 !important;
              }
              .file-upload-text {
                background: #f8f9fa !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                padding: 8px 10px !important;
                font-size: 0.8rem !important;
                color: #6c757d !important;
                flex: 1 !important;
                height: 36px !important;
                display: flex !important;
                align-items: center !important;
                min-width: 0 !important;
              }
              .admin-form-input:focus {
                border-color: #212c59 !important;
                box-shadow: 0 0 0 2px rgba(33, 44, 89, 0.1) !important;
                outline: none !important;
              }
              .admin-form-row {
                display: flex !important;
                gap: 6px !important;
                margin-bottom: 6px !important;
                width: 100% !important;
                align-items: flex-start !important;
              }
              .admin-form-row .admin-form-group {
                flex: 1 !important;
                margin-bottom: 0 !important;
                width: auto !important;
                min-width: 0 !important;
              }
              .admin-form-actions {
                display: flex !important;
                gap: 10px !important;
                justify-content: center !important;
                margin-top: 12px !important;
                padding: 0 !important;
                width: 100% !important;
              }
              .admin-btn {
                padding: 10px 20px !important;
                font-size: 0.85rem !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                transition: all 0.2s ease !important;
                cursor: pointer !important;
                border: 2px solid !important;
                flex: 1 !important;
                min-width: 0 !important;
                max-width: none !important;
                height: 40px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .admin-btn-primary {
                background: white !important;
                color: #212c59 !important;
                border-color: #212c59 !important;
              }
              .admin-btn-primary:hover {
                background: #212c59 !important;
                color: white !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(33, 44, 89, 0.3) !important;
              }
              .admin-btn-secondary {
                background: white !important;
                color: #b08d57 !important;
                border-color: #b08d57 !important;
              }
              .admin-btn-secondary:hover {
                background: #f8f6f0 !important;
                color: #b08d57 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(176, 141, 87, 0.3) !important;
              }
            `}
          </style>
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideIn 0.3s ease-out',
              transform: 'scale(1)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              height: 'auto',
              maxHeight: 'calc(100vh - 40px)',
              width: '100%',
              maxWidth: '420px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              background: '#f8f9fa',
              borderRadius: '16px',
              padding: '12px 6px'
            }}
          >
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
              <h3 style={{ 
                margin: '0', 
                color: '#212c59', 
                fontSize: '1rem', 
                fontWeight: '700',
                fontFamily: "'Montserrat', sans-serif",
                textAlign: 'center'
              }}>Add New Item</h3>
            </div>
            
            <form onSubmit={handleAdd} className="admin-form" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8f9fa', gap: '0px', marginBottom: '0px', paddingBottom: '0px' }}>
              {/* Error Display inside Add Modal */}
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
              
              <div className="admin-form-group">
                <label className="admin-form-label">Name of Item</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm(p => ({...p, name:e.target.value}))}
                  className="admin-form-input"
                  placeholder="Enter item name"
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Description</label>
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm(p => ({...p, description:e.target.value}))}
                  className="admin-form-input"
                  placeholder="Enter description"
                  rows={2}
                />
              </div>
              
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">First Price</label>
                  <input
                    type="number"
                    value={addForm.price}
                    onChange={(e) => setAddForm(p => ({...p, price:e.target.value}))}
                    className="admin-form-input"
                    placeholder="Enter first price"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Second Price (Optional)</label>
                  <input
                    type="number"
                    value={addForm.secondPrice || ''}
                    onChange={(e) => setAddForm(p => ({...p, secondPrice:e.target.value}))}
                    className="admin-form-input"
                    placeholder="Enter second price"
                  />
                </div>
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Category</label>
                <EnhancedDropdown
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  value={addForm.category}
                  onChange={(value) => setAddForm(p => ({...p, category: value}))}
                  placeholder="Select category"
                  width="100%"
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Upload Image</label>
                <div className="file-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e, setAddForm)}
                    className="admin-form-input"
                    id="add-image-upload"
                  />
                  <label htmlFor="add-image-upload" className="file-upload-button">
                    Choose File
                  </label>
                  <div className="file-upload-text">
                    {addForm.image ? addForm.image.name : 'No file chosen'}
                  </div>
                </div>
              </div>
              
              <div className="admin-form-actions" style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'center', 
                marginTop: '0px',
                paddingTop: '0px',
                maxWidth: '100%',
                width: '100%',
                boxSizing: 'border-box',
                flexShrink: 0
              }}>
                  <button
                    type="button"
                    onClick={() => {
                      // Dispatch event to close all dropdowns
                      document.dispatchEvent(new CustomEvent('modalClose'));
                      setShowAdd(false);
                      setModalError('');
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
                      e.target.style.background = '#f8f9fa';
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
                      borderRadius: '8px', // SLIGHT CURVE LIKE ADD NEW PROMO
                      padding: '12px 24px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
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
                      e.target.style.background = '#f8f9fa';
                      e.target.style.borderColor = '#212c59';
                      e.target.style.color = '#212c59';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(33, 44, 89, 0.1)';
                    }}
                  >
                    Add Item
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEdit && (
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
            backdropFilter: 'blur(4px)',
            padding: '15px',
            boxSizing: 'border-box'
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
              .admin-form-group {
                margin-bottom: 6px !important;
                width: 100% !important;
              }
              .admin-form-label {
                font-size: 0.8rem !important;
                margin-bottom: 3px !important;
                font-weight: 600 !important;
                color: #212c59 !important;
                display: block !important;
                width: 100% !important;
              }
              .admin-form-input {
                padding: 8px 10px !important;
                height: 36px !important;
                min-height: 36px !important;
                max-height: 36px !important;
                font-size: 0.8rem !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                background: #f8f9fa !important;
                width: 100% !important;
                box-sizing: border-box !important;
              }
              .admin-form-input[type="textarea"], textarea.admin-form-input {
                height: 70px !important;
                min-height: 70px !important;
                max-height: 70px !important;
                resize: none !important;
                padding: 8px 10px !important;
              }
              .admin-form-input[type="file"] {
                display: none !important;
              }
              .file-upload-container {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                width: 100% !important;
                margin-bottom: 6px !important;
              }
              .file-upload-button {
                background: #f8f9fa !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                padding: 8px 12px !important;
                font-size: 0.8rem !important;
                color: #212c59 !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                white-space: nowrap !important;
                height: 36px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .file-upload-button:hover {
                background: #e9ecef !important;
                border-color: #212c59 !important;
              }
              .file-upload-text {
                background: #f8f9fa !important;
                border: 2px solid #e9ecef !important;
                border-radius: 6px !important;
                padding: 8px 10px !important;
                font-size: 0.8rem !important;
                color: #6c757d !important;
                flex: 1 !important;
                height: 36px !important;
                display: flex !important;
                align-items: center !important;
                min-width: 0 !important;
              }
              .admin-form-input:focus {
                border-color: #212c59 !important;
                box-shadow: 0 0 0 2px rgba(33, 44, 89, 0.1) !important;
                outline: none !important;
              }
              .admin-form-row {
                display: flex !important;
                gap: 6px !important;
                margin-bottom: 6px !important;
                width: 100% !important;
                align-items: flex-start !important;
              }
              .admin-form-row .admin-form-group {
                flex: 1 !important;
                margin-bottom: 0 !important;
                width: auto !important;
                min-width: 0 !important;
              }
              .admin-form-actions {
                display: flex !important;
                gap: 10px !important;
                justify-content: center !important;
                margin-top: 12px !important;
                padding: 0 !important;
                width: 100% !important;
              }
              .admin-btn {
                padding: 10px 20px !important;
                font-size: 0.85rem !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                transition: all 0.2s ease !important;
                cursor: pointer !important;
                border: 2px solid !important;
                flex: 1 !important;
                min-width: 0 !important;
                max-width: none !important;
                height: 40px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .admin-btn-primary {
                background: white !important;
                color: #212c59 !important;
                border-color: #212c59 !important;
              }
              .admin-btn-primary:hover {
                background: #212c59 !important;
                color: white !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(33, 44, 89, 0.3) !important;
              }
              .admin-btn-secondary {
                background: white !important;
                color: #b08d57 !important;
                border-color: #b08d57 !important;
              }
              .admin-btn-secondary:hover {
                background: #f8f6f0 !important;
                color: #b08d57 !important;
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 8px rgba(176, 141, 87, 0.3) !important;
              }
            `}
          </style>
          <div 
            className="admin-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'slideIn 0.3s ease-out',
              transform: 'scale(1)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              height: 'auto',
              maxHeight: 'calc(100vh - 40px)',
              width: '100%',
              maxWidth: '420px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              background: '#f8f9fa',
              borderRadius: '16px',
              padding: '12px 6px'
            }}
          >
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
              <h3 style={{ 
                margin: '0', 
                color: '#212c59', 
                fontSize: '1rem', 
                fontWeight: '700',
                fontFamily: "'Montserrat', sans-serif",
                textAlign: 'center'
              }}>Edit Item</h3>
            </div>
            <form onSubmit={handleEdit} className="admin-form" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8f9fa', gap: '0px', marginBottom: '0px', paddingBottom: '0px' }}>
              {/* Error Display inside Edit Modal */}
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
              
              <div className="admin-form-group">
                <label className="admin-form-label">Name of Item</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(p => ({...p, name:e.target.value}))}
                  className="admin-form-input"
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(p => ({...p, description:e.target.value}))}
                  className="admin-form-input"
                  rows={2}
                />
              </div>
              
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">First Price</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm(p => ({...p, price:e.target.value}))}
                    className="admin-form-input"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Second Price (Optional)</label>
                  <input
                    type="number"
                    value={editForm.secondPrice || ''}
                    onChange={(e) => setEditForm(p => ({...p, secondPrice:e.target.value}))}
                    className="admin-form-input"
                    placeholder="Enter second price"
                  />
                </div>
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Category</label>
                <EnhancedDropdown
                  options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  value={editForm.category}
                  onChange={(value) => setEditForm(p => ({...p, category: value}))}
                  placeholder="Select category"
                  width="100%"
                />
              </div>
              
              <div className="admin-form-group">
                <label className="admin-form-label">Upload Image</label>
                <div className="file-upload-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e, setEditForm)}
                    className="admin-form-input"
                    id="edit-image-upload"
                  />
                  <label htmlFor="edit-image-upload" className="file-upload-button">
                    Choose File
                  </label>
                  <div className="file-upload-text">
                    {editForm.image ? editForm.image.name : 'No file chosen'}
                  </div>
                </div>
              </div>
              
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
                    setShowEdit(false);
                  }}
                  className="admin-btn admin-btn-secondary"
                  style={{
                    background: 'white',
                    color: '#b08d57',
                    border: '2px solid #b08d57',
                    borderRadius: '8px', // SLIGHT CURVE LIKE ADD NEW PROMO
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f8f6f0';
                    e.target.style.borderColor = '#b08d57';
                    e.target.style.color = '#b08d57';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(176, 141, 87, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f8f9fa';
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
                    borderRadius: '8px', // SLIGHT CURVE LIKE ADD NEW PROMO
                    padding: '12px 24px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
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
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#212c59';
                    e.target.style.color = '#212c59';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(33, 44, 89, 0.1)';
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
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
                font-size: 0.95rem !important;
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
                font-size: 0.95rem !important;
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
              Are you sure you want to delete this menu item?
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
                onClick={handleDelete}
                className="admin-btn admin-btn-danger"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {!showAdd && !showEdit && !showDelete && (
        <div className="menu-actions" style={{
          filter: showLogoutConfirm ? 'blur(2px)' : 'none',
          opacity: showLogoutConfirm ? 0.6 : 1,
          pointerEvents: showLogoutConfirm ? 'none' : 'auto'
        }}>
          <button className="add-item-btn" onClick={() => {
            setAddForm(emptyForm);
            setShowAdd(true);
            setModalError('');
          }}>
            <FaPlus /> Add New Item
          </button>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;


