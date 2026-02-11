
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

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
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

  // Scroll prevention
  useEffect(() => {
    if (show) {
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
  }, [show]);

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
          .admin-modal .admin-form {
            padding-left: 12px !important;
            padding-right: 12px !important;
            padding-bottom: 0 !important;
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
          }
          .admin-modal .admin-form-actions {
            display: flex !important;
            gap: 12px !important;
            justify-content: stretch !important;
            align-items: stretch !important;
            margin-top: 4px !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
            padding: 0 12px !important;
          }
          .admin-modal .admin-form-actions .admin-btn,
          .admin-modal .admin-form-actions .admin-btn-primary,
          .admin-modal .admin-form-actions .admin-btn-secondary {
            flex: 1 !important;
            min-width: 0 !important;
            width: auto !important;
            min-height: 44px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        `}
      </style>
      <div className="admin-modal" style={{
        background: '#f8f9fa',
        borderRadius: '16px',
        padding: '12px 6px',
        width: '100%',
        maxWidth: '420px',
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
            {editing ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </h3>
        </div>
        <form className="admin-form" style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#f8f9fa', marginBottom: '0px', paddingBottom: '0px' }}>
           {/* Error Display inside Add/Edit Modal */}
           {modalError && (
             <div className="error-message" style={{
               background: '#ffebee',
               border: '1px solid #f44336',
               color: '#f44336',
               padding: '8px 12px',
               borderRadius: '8px',
               marginBottom: '8px',
               fontSize: '0.85rem'
             }}>
               <p>{modalError}</p>
             </div>
           )}
           
           <div className="admin-form-group" style={{ marginBottom: '1px' }}>
             <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Item Name</label>
             <input
               type="text"
               required
               value={form.name}
               onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
               className="admin-form-input"
               placeholder="Enter item name"
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
             {errors.name && <div className="error-message">{errors.name}</div>}
           </div>

           <div className="admin-form-group" style={{ marginBottom: '1px' }}>
             <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Category</label>
             <div style={{ 
               border: '2px solid #e9ecef',
               borderRadius: '6px',
               backgroundColor: '#f8f9fa'
             }}>
               <EnhancedDropdown
                 options={CATEGORIES.map(c => ({ value: c, label: c }))}
                 value={form.category}
                 onChange={(value) => setForm((p) => ({ ...p, category: value }))}
                 placeholder="Select category"
                 width="100%"
               />
             </div>
             {errors.category && <div className="error-message">{errors.category}</div>}
           </div>

           <div className="admin-form-group" style={{ marginBottom: '1px' }}>
             <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Item Image</label>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                           padding: '6px 8px', 
                           border: '1px dashed #e9ecef',
                           borderRadius: '6px',
                           cursor: 'pointer',
                           textAlign: 'center',
                           flex: 1,
                           background: '#f8f9fa',
                           transition: 'all 0.3s ease',
                           position: 'relative',
                           minHeight: '32px', 
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
             <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '2px' }}>
               Upload an image so baristas can easily identify items with low stock
             </div>
           </div>

           <div className="admin-form-row" style={{ marginBottom: '1px', display: 'flex', gap: '1px' }}>
             <div className="admin-form-group" style={{ flex: 1 }}>
               <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Current Stock</label>
               <input
                 type="number"
                 min="0"
                 value={form.currentStock}
                 onChange={(e) => setForm((p) => ({ ...p, currentStock: e.target.value }))}
                 className="admin-form-input"
                 placeholder="e.g. 10, 25, 50"
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
               {errors.currentStock && <div className="error-message">{errors.currentStock}</div>}
             </div>
             <div className="admin-form-group" style={{ flex: 1 }}>
               <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Min Threshold</label>
               <input
                 type="number"
                 min="0"
                 value={form.minimumThreshold}
                 onChange={(e) => setForm((p) => ({ ...p, minimumThreshold: e.target.value }))}
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
               {errors.minimumThreshold && <div className="error-message">{errors.minimumThreshold}</div>}
             </div>
           </div>


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
              .admin-modal .admin-btn-danger:hover {
                background: #dc3545 !important;
                border-color: #dc3545 !important;
                color: white !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3) !important;
              }
              .admin-modal .admin-form-actions {
                display: flex !important;
                gap: 12px !important;
                justify-content: stretch !important;
                align-items: stretch !important;
                padding: 0 12px !important;
                margin-bottom: 24px !important;
                box-sizing: border-box !important;
              }
              .admin-modal .admin-form-actions .admin-btn,
              .admin-modal .admin-form-actions .admin-btn-secondary,
              .admin-modal .admin-form-actions .admin-btn-danger {
                flex: 1 !important;
                min-width: 0 !important;
                width: auto !important;
                min-height: 44px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
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
            
            <div className="delete-confirmation-text" style={{ textAlign: 'center', marginBottom: '25px', padding: '0 12px' }}>
              Are you sure you want to delete this inventory item?
            </div>
            
            <div className="admin-form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowDelete(false)}
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
