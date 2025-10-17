
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, 
  FaFilter, FaDownload, FaUpload, FaExclamationTriangle,
  FaBox, FaChartLine, FaWarehouse, FaClipboardList,
  FaArrowUp, FaArrowDown, FaEquals, FaHistory, FaChartBar
} from 'react-icons/fa';
import { Package, TrendingUp, AlertTriangle, DollarSign, Coins } from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';

const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];


const emptyForm = {
  name: '', category: 'Donuts', currentStock: '', minimumThreshold: '', 
  imageUrl: '', imageFile: null
};


// Add/Edit Inventory Item Modal Component
const AddEditInventoryModal = ({ show, onHide, onSave, editing, initialData, modalError }) => {
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
    
    if (!form.name.trim()) newErrors.name = "Please fill up all blanks";
    if (!form.category) newErrors.category = "Please fill up all blanks";
    
    // Only validate numeric fields if they have values
    if (form.currentStock && form.currentStock !== '' && parseFloat(form.currentStock) < 0) {
      newErrors.currentStock = "Current stock cannot be negative";
    }
    if (form.minimumThreshold && form.minimumThreshold !== '' && parseFloat(form.minimumThreshold) < 0) {
      newErrors.minimumThreshold = "Minimum threshold cannot be negative";
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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
        display: show ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: show ? 'fadeIn 0.3s ease-out' : 'none'
      }}
    >
      <div 
        className="admin-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: show ? 'slideIn 0.3s ease-out' : 'none',
          transform: 'scale(1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(0, 0, 0, 0.1)',
              height: 'auto',
              maxHeight: 'calc(100vh - 40px)',
              width: '100%',
              maxWidth: '550px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
        }}
      >
        <div style={{ 
          position: 'relative', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '5px',
          padding: '10px 15px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
          borderRadius: '20px 20px 0 0',
          borderBottom: '2px solid rgba(33, 44, 89, 0.1)',
          flexShrink: 0
        }}>
          <h3 style={{ 
            margin: '0', 
            color: '#212c59', 
            fontSize: '1.1rem', 
            fontWeight: '700',
            fontFamily: "'Montserrat', sans-serif"
          }}>{editing ? "Edit Inventory Item" : "Add New Inventory Item"}</h3>
          <button
            onClick={() => {
              // Dispatch event to close all dropdowns
              document.dispatchEvent(new CustomEvent('modalClose'));
              onHide();
            }}
            className="modal-close-btn"
            style={{
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
        
         <form className="admin-form" style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
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
           {/* Item Name */}
           <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
             <label className="admin-form-label" style={{ marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>Item Name</label>
               <input
                 type="text"
                 value={form.name}
                 onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                 className="admin-form-input"
                 placeholder=""
                 style={{ 
                   padding: '0.6rem 0.8rem', 
                   height: '40px',
                   fontSize: '0.9rem',
                   border: errors.name ? '2px solid #dc3545' : '1px solid #e9ecef',
                   borderRadius: '8px',
                   width: '100%',
                   transition: 'border-color 0.3s ease'
                 }}
               />
           </div>

           {/* Category */}
           <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
             <label className="admin-form-label" style={{ marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>Category</label>
             <div style={{ 
               border: errors.category ? '2px solid #dc3545' : '1px solid #e9ecef',
               borderRadius: '8px',
               transition: 'border-color 0.3s ease'
             }}>
               <EnhancedDropdown
                 options={CATEGORIES.map(c => ({ value: c, label: c }))}
                 value={form.category}
                 onChange={(value) => setForm((p) => ({ ...p, category: value }))}
                 placeholder="Select category"
                 width="100%"
               />
             </div>
           </div>

           {/* Item Image */}
           <div className="admin-form-group" style={{ marginBottom: '0.25rem' }}>
             <label className="admin-form-label" style={{ marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>Item Image</label>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <input
                 type="file"
                 accept="image/*"
                 onChange={(e) => {
                   const file = e.target.files[0];
                   if (file) {
                     // Validate file type
                     if (!file.type.startsWith('image/')) {
                       alert('Please select an image file');
                       return;
                     }
                     
                     // Validate file size (50MB limit)
                     const maxSize = 50 * 1024 * 1024; // 50MB in bytes
                     if (file.size > maxSize) {
                       alert('File size too large. Please select an image smaller than 50MB');
                       return;
                     }
                     
                     // Store the file for upload
                     setForm(prev => ({ ...prev, imageFile: file }));
                     
                     // Create preview URL
                     const reader = new FileReader();
                     reader.onload = (e) => {
                       setForm(prev => ({ ...prev, imageUrl: e.target.result }));
                     };
                     reader.readAsDataURL(file);
                   }
                 }}
                 style={{ display: 'none' }}
                 id="image-upload"
               />
               <div
                 onClick={() => document.getElementById('image-upload').click()}
                 onDragOver={(e) => {
                   e.preventDefault();
                   e.currentTarget.style.borderColor = '#212c59';
                   e.currentTarget.style.background = '#f0f2f5';
                 }}
                 onDragLeave={(e) => {
                   e.currentTarget.style.borderColor = '#e9ecef';
                   e.currentTarget.style.background = '#f8f9fa';
                 }}
                 onDrop={(e) => {
                   e.preventDefault();
                   e.currentTarget.style.borderColor = '#e9ecef';
                   e.currentTarget.style.background = '#f8f9fa';
                   
                   const files = e.dataTransfer.files;
                   if (files.length > 0) {
                     const file = files[0];
                     if (file.type.startsWith('image/')) {
                       const reader = new FileReader();
                       reader.onload = (e) => {
                         setForm(prev => ({ ...prev, imageUrl: e.target.result }));
                       };
                       reader.readAsDataURL(file);
                     }
                   }
                 }}
                         style={{ 
                           padding: '0.75rem 1rem', 
                           border: '1px solid #e9ecef',
                           borderRadius: '8px',
                           cursor: 'pointer',
                           textAlign: 'center',
                           flex: 1,
                           background: '#f8f9fa',
                           transition: 'all 0.3s ease',
                           position: 'relative',
                           height: '45px', 
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center'
                         }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.borderColor = '#212c59';
                   e.currentTarget.style.background = '#f0f2f5';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.borderColor = '#e9ecef';
                   e.currentTarget.style.background = '#f8f9fa';
                 }}
               >
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <div style={{ fontSize: '1.2rem', color: '#6c757d' }}>📷</div>
                   <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>
                     {form.imageUrl ? 'Change Image' : 'Upload Image'}
                   </div>
                 </div>
               </div>
               {form.imageUrl && (
                 <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e9ecef' }}>
                   <img
                     src={form.imageUrl}
                     alt="Item preview"
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                   />
                 </div>
               )}
             </div>
             <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.5rem' }}>
               Upload an image so baristas can easily identify items with low stock
             </div>
           </div>

           {/* Stock Information */}
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.25rem' }}>
             <div className="admin-form-group">
               <label className="admin-form-label" style={{ marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>Current Stock</label>
                     <input
                       type="number"
                       min="0"
                       value={form.currentStock}
                       onChange={(e) => setForm((p) => ({ ...p, currentStock: e.target.value }))}
                       className="admin-form-input"
                       placeholder=""
                       style={{
                         padding: '0.6rem 0.8rem', 
                         height: '40px',
                         fontSize: '0.9rem',
                         border: errors.currentStock ? '2px solid #dc3545' : '1px solid #e9ecef',
                         borderRadius: '8px',
                         width: '100%',
                         transition: 'border-color 0.3s ease'
                       }}
                     />
             </div>
             
             <div className="admin-form-group">
               <label className="admin-form-label" style={{ marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600', color: '#212c59' }}>Min Threshold</label>
                     <input
                       type="number"
                       min="0"
                       value={form.minimumThreshold}
                       onChange={(e) => setForm((p) => ({ ...p, minimumThreshold: e.target.value }))}
                       className="admin-form-input"
                       placeholder=""
                       style={{
                         padding: '0.6rem 0.8rem', 
                         height: '40px',
                         fontSize: '0.9rem',
                         border: errors.minimumThreshold ? '2px solid #dc3545' : '1px solid #e9ecef',
                         borderRadius: '8px',
                         width: '100%',
                         transition: 'border-color 0.3s ease'
                       }}
                     />
             </div>
           </div>


         </form>
          
          <div className="admin-form-actions" style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'flex-end', 
            padding: '0.75rem',
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
                color: '#b08d57',
                border: '2px solid #b08d57',
                borderRadius: '12px',
                padding: '12px 24px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)',
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
              onClick={handleSave}
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
              {editing ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
      </div>
    </div>
  );
};

// Stock Movement Modal Component

const InventoryManagement = () => {
  const [items, setItems] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const { showLogoutConfirm } = useModalContext();

  // Filters and search
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    stockStatus: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  // const [showAnalytics, setShowAnalytics] = useState(false);

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

  // Form states
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUserInfo();
    fetchDashboardData();
    fetchItems();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [filters, sortBy, sortOrder, currentPage]);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/inventory/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const queryParams = new URLSearchParams({
        ...filters,
        page: currentPage,
        sortBy,
        sortOrder
      });

      const response = await fetch(`${API_BASE}/api/inventory?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setTotalPages(data.pagination.pages);
      } else {
        setError('Failed to fetch inventory items');
      }
    } catch (err) {
      setError('Error fetching inventory items');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (item) => {
    if (item.currentStock === 0) return { status: 'out_of_stock', class: 'out-of-stock', label: 'Out of Stock' };
    if (item.currentStock <= item.minimumThreshold) return { status: 'low_stock', class: 'low-stock', label: 'Low Stock' };
    if (item.currentStock >= item.maximumThreshold) return { status: 'overstocked', class: 'overstocked', label: 'Overstocked' };
    return { status: 'in_stock', class: 'in-stock', label: 'In Stock' };
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'purchase': return <FaArrowUp style={{ color: '#28a745' }} />;
      case 'sale': return <FaArrowDown style={{ color: '#dc3545' }} />;
      case 'adjustment': return <FaEquals style={{ color: '#ffc107' }} />;
      default: return <FaHistory style={{ color: '#6c757d' }} />;
    }
  };

  const handleAdd = async (formData) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('currentStock', formData.currentStock || '');
      formDataToSend.append('minimumThreshold', formData.minimumThreshold || '');
      
      // Add image file if exists
      if (formData.imageFile) {
        formDataToSend.append('image', formData.imageFile);
      }
      
      const response = await fetch(`${API_BASE}/api/inventory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type, let browser set it for FormData
        },
        body: formDataToSend
      });

      if (response.ok) {
        setShowAdd(false);
        await fetchItems();
        await fetchDashboardData();
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'inventory_item_added', item: formData.name } 
        }));
        window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
          detail: { action: 'item_added', item: formData.name } 
        }));
      } else {
        const errorData = await response.json();
        if (errorData.error === 'Validation failed' && errorData.details) {
          const validationErrors = errorData.details.map(err => `${err.field}: ${err.message}`).join(', ');
          setModalError(`Validation failed: ${validationErrors}`);
        } else {
          setModalError(errorData.message || errorData.error || 'Failed to add item');
        }
      }
    } catch (err) {
      setModalError(err.message || 'Failed to add item');
    }
  };

  const handleEdit = async (formData) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/inventory/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowEdit(false);
        setEditingItem(null);
        await fetchItems();
        await fetchDashboardData();
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'inventory_item_updated', item: formData.name } 
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
      const response = await fetch(`${API_BASE}/api/inventory/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setShowDelete(false);
        setDeleteId('');
        setModalError(''); // Clear any previous errors
        await fetchItems();
        await fetchDashboardData();
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'inventory_item_deleted' } 
        }));
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        setModalError(errorData.message || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setModalError(err.message || 'Failed to delete item');
    }
  };


  const openEdit = (item) => {
    setEditingItem(item);
    setModalError(''); // Clear any previous errors
    setShowEdit(true);
  };



  if (currentUser?.role === 'staff') {
    return (
      <div className="access-denied-container">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>Staff members cannot access the Inventory Management section.</p>
          <p>This section requires Manager or Owner privileges.</p>
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        border: '1px solid #e9ecef'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            fontSize: '2rem',
            color: '#1976d2',
            background: '#e3f2fd',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '1rem'
          }}>
            <Package />
          </div>
          <div>
            <h1 style={{ margin: '0', color: '#212c59', fontSize: '1.8rem', fontWeight: '700' }}>
              Inventory Management
            </h1>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              fontSize: '2rem',
              color: '#1976d2',
              background: '#e3f2fd',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaBox />
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Total Items</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#212c59' }}>
                {dashboardData.totalItems || 0}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              fontSize: '2rem',
              color: '#ffc107',
              background: '#fff3cd',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaExclamationTriangle />
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Low Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#212c59' }}>
                {dashboardData.lowStockItems || 0}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              fontSize: '2rem',
              color: '#dc3545',
              background: '#f8d7da',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FaBox />
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginBottom: '0.5rem' }}>Out of Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#212c59' }}>
                {dashboardData.outOfStockItems || 0}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Filters and Search */}
      <div style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        marginBottom: '2rem',
        border: '1px solid #e9ecef'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#212c59' }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.9rem'
                }}
              />
              <FaSearch style={{
                position: 'absolute',
                right: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6c757d'
              }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#212c59' }}>
              Category
            </label>
            <EnhancedDropdown
              options={[
                { value: 'all', label: 'All Categories' },
                ...CATEGORIES.map(c => ({ value: c, label: c }))
              ]}
              value={filters.category}
              onChange={(value) => setFilters({...filters, category: value})}
              width="100%"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#212c59' }}>
              Stock Status
            </label>
            <EnhancedDropdown
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'in_stock', label: 'In Stock' },
                { value: 'low_stock', label: 'Low Stock' },
                { value: 'out_of_stock', label: 'Out of Stock' },
                { value: 'overstocked', label: 'Overstocked' }
              ]}
              value={filters.stockStatus}
              onChange={(value) => setFilters({...filters, stockStatus: value})}
              width="100%"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#212c59' }}>
              Sort By
            </label>
            <EnhancedDropdown
              options={[
                { value: 'name', label: 'Name' },
                { value: 'currentStock', label: 'Stock Level' },
                { value: 'createdAt', label: 'Date Added' }
              ]}
              value={sortBy}
              onChange={setSortBy}
              width="100%"
            />
          </div>
        </div>
        
      </div>

      {/* Error Message */}
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

      {/* Loading State */}
      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          color: '#6c757d'
        }}>
          <div style={{ marginRight: '0.5rem' }}>Loading...</div>
        </div>
      )}

      {/* Inventory Items Grid */}
      {!loading && (
        <div className="inventory-grid">
          {items.map(item => {
            const stockStatus = getStockStatus(item);
            return (
               <div key={item._id} className="inventory-item">
                 {/* Item Image */}
                 <div className="inventory-item-image">
                   {item.imageUrl ? (
                     <img 
                       src={`${API_BASE}${item.imageUrl}`} 
                       alt={item.name}
                       onLoad={() => {}}
                       onError={() => {}}
                     />
                   ) : (
                     <div className="placeholder-image">
                       <FaBox size={40} color="#6c757d" />
                     </div>
                   )}
                   <div className="inventory-item-actions">
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
                   </div>
                 </div>
                 
                 <div className="inventory-item-content">
                   <div className="inventory-item-header">
                     <h3 className="inventory-item-name">{item.name}</h3>
                     <div className={`stock-status ${stockStatus.class}`}>
                       {stockStatus.label}
                     </div>
                   </div>

                   <div className="inventory-item-details">
                     <div className="detail-row">
                       <span className="detail-label">Category:</span>
                       <span className="detail-value">{item.category}</span>
                     </div>
                     <div className="detail-row">
                       <span className="detail-label">Current Stock:</span>
                       <span className="detail-value">
                         {item.currentStock}
                       </span>
                     </div>
                     <div className="detail-row">
                       <span className="detail-label">Min Threshold:</span>
                       <span className="detail-value">
                         {item.minimumThreshold}
                       </span>
                     </div>
                   </div>
                 </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddEditInventoryModal
        show={showAdd}
        onHide={() => {
          // Dispatch event to close all dropdowns
          document.dispatchEvent(new CustomEvent('modalClose'));
          setShowAdd(false);
          setModalError('');
        }}
        onSave={handleAdd}
        editing={false}
        initialData={null}
        modalError={modalError}
      />

      <AddEditInventoryModal
        show={showEdit}
        onHide={() => {
          // Dispatch event to close all dropdowns
          document.dispatchEvent(new CustomEvent('modalClose'));
          setShowEdit(false);
          setModalError('');
        }}
        onSave={handleEdit}
        editing={true}
        initialData={editingItem}
        modalError={modalError}
      />


      {/* Delete Confirm Modal */}
      {showDelete && (
        <ResponsiveModal
          show={showDelete}
          onHide={() => setShowDelete(false)}
          title="Delete Item"
          size="small"
        >
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px' }}>
              Are you sure you want to permanently delete this inventory item?
              <br />
              <span style={{ color: '#dc3545', fontSize: '0.9rem', fontWeight: '600' }}>
                This action cannot be undone!
              </span>
            </div>
            
            {modalError && (
              <div className="form-error" style={{ 
                marginBottom: '20px', 
                textAlign: 'center',
                background: '#f8d7da',
                color: '#721c24',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #f5c6cb'
              }}>
                {modalError}
              </div>
            )}
            
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDelete(false)}
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
                onClick={handleDelete}
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
                Delete Item
              </button>
            </div>
        </ResponsiveModal>
      )}

      {/* Floating Add Button */}
      {!showAdd && !showEdit && !showDelete && (
        <div className="menu-actions" style={{
          filter: showLogoutConfirm ? 'blur(2px)' : 'none',
          opacity: showLogoutConfirm ? 0.6 : 1,
          pointerEvents: showLogoutConfirm ? 'none' : 'auto',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button className="add-item-btn" onClick={() => {
            setShowAdd(true);
            setModalError('');
          }}>
            <FaPlus /> Add Inventory Item
          </button>
        </div>
      )}

    </div>
  );
};

export default InventoryManagement;
