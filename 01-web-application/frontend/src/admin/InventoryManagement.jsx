
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch, 
  FaFilter, FaDownload, FaUpload, FaExclamationTriangle,
  FaBox, FaChartLine, FaWarehouse, FaClipboardList,
  FaArrowUp, FaArrowDown, FaEquals, FaHistory, FaChartBar
} from 'react-icons/fa';
import { Package, TrendingUp, AlertTriangle, DollarSign, Coins, Check, Loader2 } from 'lucide-react';
import { useModalContext } from './context/ModalContext';
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';
import ResponsiveModal from './components/ResponsiveModal';
import { AdminStatCardsGrid, AdminStatCard } from './components/AdminStatCards';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

/** GridFS image paths are relative to the API host; the React app runs on another origin. */
const resolveInventoryImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const u = url.trim();
  if (u.startsWith('data:') || u.startsWith('blob:')) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const base = (API_BASE || '').replace(/\/$/, '');
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
};

const formatInventoryCardPrice = (item) => {
  const hasFirst =
    item.firstPrice != null && item.firstPrice !== '' && !Number.isNaN(Number(item.firstPrice));
  const hasSecond =
    item.secondPrice != null && item.secondPrice !== '' && !Number.isNaN(Number(item.secondPrice));
  const fmt = (n) =>
    `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  if (hasFirst && hasSecond) return `${fmt(item.firstPrice)} / ${fmt(item.secondPrice)}`;
  if (hasFirst) return fmt(item.firstPrice);
  if (hasSecond) return fmt(item.secondPrice);
  return '—';
};


const emptyForm = {
  name: '',
  category: 'Donuts',
  firstPrice: '',
  secondPrice: '',
  currentStock: '',
  minimumThreshold: '',
  imageUrl: '',
  imageFile: null
};


// Add/Edit Inventory Item Modal Component
const AddEditInventoryModal = ({ show, onHide, onSave, editing, initialData, modalError, saving }) => {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData && (initialData.name != null || initialData._id)) {
      setForm({
        name: initialData.name ?? '',
        category: initialData.category || 'Donuts',
        firstPrice:
          initialData.firstPrice != null && initialData.firstPrice !== ''
            ? String(initialData.firstPrice)
            : '',
        secondPrice:
          initialData.secondPrice != null && initialData.secondPrice !== ''
            ? String(initialData.secondPrice)
            : '',
        currentStock:
          initialData.currentStock != null && initialData.currentStock !== ''
            ? String(initialData.currentStock)
            : '',
        minimumThreshold:
          initialData.minimumThreshold != null && initialData.minimumThreshold !== ''
            ? String(initialData.minimumThreshold)
            : '',
        imageUrl: resolveInventoryImageUrl(initialData.imageUrl || ''),
        imageFile: null
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [initialData, show]);


  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) newErrors.name = "Please fill up all blanks";
    if (!form.category) newErrors.category = "Please fill up all blanks";
    if (form.firstPrice === '' || form.firstPrice === null || Number.isNaN(parseFloat(form.firstPrice))) {
      newErrors.firstPrice = "First price is required";
    } else if (parseFloat(form.firstPrice) < 0) {
      newErrors.firstPrice = "Price cannot be negative";
    }
    if (form.secondPrice !== '' && form.secondPrice != null && !Number.isNaN(parseFloat(form.secondPrice)) && parseFloat(form.secondPrice) < 0) {
      newErrors.secondPrice = "Price cannot be negative";
    }
    
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

           <div className="admin-form-row" style={{ marginBottom: '1px', display: 'flex', gap: '8px' }}>
             <div className="admin-form-group" style={{ flex: 1 }}>
               <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>First Price (₱)</label>
               <input
                 type="number"
                 min="0"
                 step="0.01"
                 value={form.firstPrice}
                 onChange={(e) => setForm((p) => ({ ...p, firstPrice: e.target.value }))}
                 className="admin-form-input"
                 placeholder="e.g. 120"
                 style={{
                   padding: '8px 12px',
                   height: '40px',
                   border: '2px solid #e9ecef',
                   borderRadius: '6px',
                   fontSize: '0.8rem',
                   backgroundColor: '#f8f9fa',
                   boxSizing: 'border-box',
                   width: '100%'
                 }}
               />
               {errors.firstPrice && <div className="error-message">{errors.firstPrice}</div>}
             </div>
             <div className="admin-form-group" style={{ flex: 1 }}>
               <label className="admin-form-label" style={{ marginBottom: '0px', fontSize: '0.75rem', fontWeight: '600', color: '#212c59' }}>Second Price (₱, optional)</label>
               <input
                 type="number"
                 min="0"
                 step="0.01"
                 value={form.secondPrice}
                 onChange={(e) => setForm((p) => ({ ...p, secondPrice: e.target.value }))}
                 className="admin-form-input"
                 placeholder="Enter second price"
                 style={{
                   padding: '8px 12px',
                   height: '40px',
                   border: '2px solid #e9ecef',
                   borderRadius: '6px',
                   fontSize: '0.8rem',
                   backgroundColor: '#f8f9fa',
                   boxSizing: 'border-box',
                   width: '100%'
                 }}
               />
               {errors.secondPrice && <div className="error-message">{errors.secondPrice}</div>}
             </div>
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
                       setForm(prev => ({ ...prev, imageFile: file }));
                       const reader = new FileReader();
                       reader.onload = (ev) => {
                         setForm(prev => ({ ...prev, imageUrl: ev.target.result }));
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
                 <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e9ecef', background: '#eee' }}>
                   <img
                     src={resolveInventoryImageUrl(form.imageUrl)}
                     alt="Item preview"
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     onError={(e) => {
                       e.target.style.display = 'none';
                     }}
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
              disabled={saving}
              style={{ opacity: saving ? 0.9 : 1, cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={18} style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
                  {editing ? 'Saving...' : 'Adding...'}
                </span>
              ) : (
                editing ? 'Save Changes' : 'Add Item'
              )}
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

  // Loading and success modals
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [showAddSuccessModal, setShowAddSuccessModal] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);

  // Prevent body scrolling when any modal is open
  useEffect(() => {
    if (showAdd || showEdit || showDelete || showAddSuccessModal || showEditSuccessModal || showDeleteSuccessModal) {
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
  }, [showAdd, showEdit, showDelete, showAddSuccessModal, showEditSuccessModal, showDeleteSuccessModal]);

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

  // Refetch dashboard when user returns to this tab (e.g. after backend restart)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
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
    setIsAddingItem(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('firstPrice', formData.firstPrice ?? '');
      formDataToSend.append('secondPrice', formData.secondPrice ?? '');
      formDataToSend.append('currentStock', formData.currentStock || '');
      formDataToSend.append('minimumThreshold', formData.minimumThreshold || '');
      if (formData.imageFile) {
        formDataToSend.append('image', formData.imageFile);
      }

      const response = await fetch(`${API_BASE}/api/inventory`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataToSend
      });

      if (response.ok) {
        const itemName = formData.name;
        setShowAdd(false);
        setModalError('');
        await fetchItems();
        await fetchDashboardData();
        setTimeout(() => setShowAddSuccessModal(true), 120);
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'inventory_item_added', item: itemName } 
        }));
        window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
          detail: { action: 'item_added', item: itemName } 
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
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleEdit = async (formData) => {
    setIsUpdatingItem(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('category', formData.category);
      fd.append('firstPrice', formData.firstPrice ?? '');
      fd.append('secondPrice', formData.secondPrice ?? '');
      fd.append('currentStock', formData.currentStock ?? '');
      fd.append('minimumThreshold', formData.minimumThreshold ?? '');
      if (formData.imageFile) {
        fd.append('image', formData.imageFile);
      }

      const response = await fetch(`${API_BASE}/api/inventory/${editingItem._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fd
      });

      if (response.ok) {
        const itemName = formData.name;
        setShowEdit(false);
        setEditingItem(null);
        setModalError('');
        await fetchItems();
        await fetchDashboardData();
        setTimeout(() => setShowEditSuccessModal(true), 120);
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'inventory_item_updated', item: itemName } 
        }));
      } else {
        const errorData = await response.json();
        setModalError(errorData.message || 'Failed to update item');
      }
    } catch (err) {
      setModalError(err.message || 'Failed to update item');
    } finally {
      setIsUpdatingItem(false);
    }
  };


  const handleDelete = async () => {
    setIsDeletingItem(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/inventory/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setShowDelete(false);
        setDeleteId('');
        setModalError('');
        await fetchItems();
        await fetchDashboardData();
        setTimeout(() => setShowDeleteSuccessModal(true), 120);
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
    } finally {
      setIsDeletingItem(false);
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

  const lowStockCount = Math.max(
    dashboardData.lowStockItems ?? 0,
    items.filter((i) => i.currentStock > 0 && i.currentStock <= (i.minimumThreshold ?? i.minThreshold ?? 0)).length
  );
  const outOfStockCount = dashboardData.outOfStockItems || 0;

  return (
    <div className="admin-page inventory-management-page">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes inventorySuccessSlideIn {
          from { opacity: 0; transform: scale(0.92) translateY(-16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      {/* Page Header - same style as Customer Feedback and other admin pages */}
      <PageHeader title="Inventory Management" icon={Package} />

      <AdminStatCardsGrid variant="featured" count={3}>
        <AdminStatCard
          variant="featured"
          label="Total Items"
          value={dashboardData.totalItems || 0}
          icon={FaBox}
          iconColor="#1976d2"
          iconBackground="#e3f2fd"
        />
        <AdminStatCard
          variant="featured"
          label="Low Stock"
          value={lowStockCount}
          icon={FaExclamationTriangle}
          iconColor="#ffc107"
          iconBackground="#fff3cd"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              stockStatus: prev.stockStatus === 'low_stock' ? 'all' : 'low_stock',
            }))
          }
          title={lowStockCount > 0 ? 'Click to show only low stock items' : 'No low stock items'}
          hint={lowStockCount > 0 ? 'Click to view' : undefined}
          cardStyle={
            lowStockCount > 0
              ? { background: '#fffbf0', border: '2px solid #ffc107' }
              : undefined
          }
        />
        <AdminStatCard
          variant="featured"
          label="Out of Stock"
          value={outOfStockCount}
          icon={FaBox}
          iconColor="#dc3545"
          iconBackground="#f8d7da"
          onClick={() =>
            setFilters((prev) => ({
              ...prev,
              stockStatus: prev.stockStatus === 'out_of_stock' ? 'all' : 'out_of_stock',
            }))
          }
          title={outOfStockCount > 0 ? 'Click to show only out of stock items' : 'No out of stock items'}
          hint={outOfStockCount > 0 ? 'Click to view' : undefined}
          cardStyle={
            outOfStockCount > 0
              ? { background: '#fff5f5', border: '2px solid #dc3545' }
              : undefined
          }
        />
      </AdminStatCardsGrid>

      {/* Low stock alert banner - so baristas see at a glance and can jump to low stock items */}
      {(dashboardData.lowStockItems ?? 0) > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fffbf0 0%, #fff8e1 100%)',
          border: '2px solid #ffc107',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 2px 12px rgba(255, 193, 7, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaExclamationTriangle style={{ fontSize: '1.5rem', color: '#e6a800', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: '#212c59' }}>
              {dashboardData.lowStockItems} item{(dashboardData.lowStockItems ?? 0) !== 1 ? 's' : ''} {((dashboardData.lowStockItems ?? 0) !== 1 ? 'are' : 'is')} low on stock
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilters(prev => ({ ...prev, stockStatus: filters.stockStatus === 'low_stock' ? 'all' : 'low_stock' }))}
            style={{
              padding: '0.5rem 1rem',
              background: '#ffc107',
              color: '#212c59',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(255, 193, 7, 0.3)'
            }}
          >
            {filters.stockStatus === 'low_stock' ? 'Show all items' : 'Show low stock only'}
          </button>
        </div>
      )}

      {/* Out of stock alert banner */}
      {(dashboardData.outOfStockItems ?? 0) > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fff5f5 0%, #ffebee 100%)',
          border: '2px solid #dc3545',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 2px 12px rgba(220, 53, 69, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaBox style={{ fontSize: '1.5rem', color: '#dc3545', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: '#212c59' }}>
              {dashboardData.outOfStockItems} item{(dashboardData.outOfStockItems ?? 0) !== 1 ? 's' : ''} {((dashboardData.outOfStockItems ?? 0) !== 1 ? 'are' : 'is')} out of stock
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilters(prev => ({ ...prev, stockStatus: filters.stockStatus === 'out_of_stock' ? 'all' : 'out_of_stock' }))}
            style={{
              padding: '0.5rem 1rem',
              background: '#dc3545',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 53, 69, 0.3)'
            }}
          >
            {filters.stockStatus === 'out_of_stock' ? 'Show all items' : 'Show out of stock only'}
          </button>
        </div>
      )}

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
            const isLowStock = stockStatus.status === 'low_stock';
            const isOutOfStock = stockStatus.status === 'out_of_stock';
            const cardStyle = isOutOfStock
              ? { borderLeft: '4px solid #dc3545', background: 'linear-gradient(90deg, rgba(220, 53, 69, 0.08) 0%, transparent 8%)' }
              : isLowStock
                ? { borderLeft: '4px solid #ffc107', background: 'linear-gradient(90deg, rgba(255, 193, 7, 0.06) 0%, transparent 8%)' }
                : undefined;
            return (
               <div key={item._id} className={`inventory-item ${isLowStock ? 'inventory-item--low-stock' : ''} ${isOutOfStock ? 'inventory-item--out-of-stock' : ''}`} style={cardStyle}>
                 {/* Item Image */}
                 <div className="inventory-item-image">
                   {item.imageUrl ? (
                     <img 
                       src={resolveInventoryImageUrl(item.imageUrl)} 
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
                       <span className="detail-value" style={{ textAlign: 'right' }}>{item.category}</span>
                     </div>
                     <div className="detail-row">
                       <span className="detail-label">Price:</span>
                       <span className="detail-value" style={{ textAlign: 'right' }}>
                         {formatInventoryCardPrice(item)}
                       </span>
                     </div>
                     <div className="detail-row">
                       <span className="detail-label">Current Stock:</span>
                       <span className="detail-value" style={{ textAlign: 'right' }}>
                         {item.currentStock}
                       </span>
                     </div>
                     <div className="detail-row">
                       <span className="detail-label">Min Threshold:</span>
                       <span className="detail-value" style={{ textAlign: 'right' }}>
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
          document.dispatchEvent(new CustomEvent('modalClose'));
          setShowAdd(false);
          setModalError('');
        }}
        onSave={handleAdd}
        editing={false}
        initialData={null}
        modalError={modalError}
        saving={isAddingItem}
      />

      <AddEditInventoryModal
        show={showEdit}
        onHide={() => {
          document.dispatchEvent(new CustomEvent('modalClose'));
          setShowEdit(false);
          setModalError('');
        }}
        onSave={handleEdit}
        editing={true}
        initialData={editingItem}
        modalError={modalError}
        saving={isUpdatingItem}
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
                disabled={isDeletingItem}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="admin-btn admin-btn-danger"
                disabled={isDeletingItem}
              >
                {isDeletingItem ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={18} style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }} />
                    Deleting...
                  </span>
                ) : (
                  'Delete Item'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modals */}
      {showAddSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '15px', boxSizing: 'border-box' }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', animation: 'inventorySuccessSlideIn 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)' }}>
              <Check size={40} color="white" strokeWidth={2.5} />
            </div>
            <h2 style={{ color: '#212c59', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', lineHeight: 1.3 }}>Item Added Successfully!</h2>
            <p style={{ color: '#5a6c7d', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', margin: '0 0 32px 0', lineHeight: 1.5 }}>The inventory item has been added.</p>
            <button type="button" onClick={() => setShowAddSuccessModal(false)} style={{ background: 'white', color: '#212c59', border: '2px solid #212c59', borderRadius: '12px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.background = '#212c59'; e.target.style.color = 'white'; e.target.style.borderColor = '#0d1220'; }} onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#212c59'; e.target.style.borderColor = '#212c59'; }}>Close</button>
          </div>
        </div>
      )}
      {showEditSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '15px', boxSizing: 'border-box' }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', animation: 'inventorySuccessSlideIn 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)' }}>
              <Check size={40} color="white" strokeWidth={2.5} />
            </div>
            <h2 style={{ color: '#212c59', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', lineHeight: 1.3 }}>Changes Saved Successfully!</h2>
            <p style={{ color: '#5a6c7d', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', margin: '0 0 32px 0', lineHeight: 1.5 }}>The inventory item has been updated.</p>
            <button type="button" onClick={() => setShowEditSuccessModal(false)} style={{ background: 'white', color: '#212c59', border: '2px solid #212c59', borderRadius: '12px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.background = '#212c59'; e.target.style.color = 'white'; e.target.style.borderColor = '#0d1220'; }} onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#212c59'; e.target.style.borderColor = '#212c59'; }}>Close</button>
          </div>
        </div>
      )}
      {showDeleteSuccessModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(8px)', padding: '15px', boxSizing: 'border-box' }}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', maxWidth: '400px', width: '90%', padding: '32px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', animation: 'inventorySuccessSlideIn 0.3s ease-out' }}>
            <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 20px rgba(40, 167, 69, 0.3)' }}>
              <Check size={40} color="white" strokeWidth={2.5} />
            </div>
            <h2 style={{ color: '#212c59', fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: '700', margin: '0 0 12px 0', lineHeight: 1.3 }}>Item Deleted Successfully!</h2>
            <p style={{ color: '#5a6c7d', fontFamily: "'Montserrat', sans-serif", fontSize: '16px', margin: '0 0 32px 0', lineHeight: 1.5 }}>The inventory item has been removed.</p>
            <button type="button" onClick={() => setShowDeleteSuccessModal(false)} style={{ background: 'white', color: '#212c59', border: '2px solid #212c59', borderRadius: '12px', padding: '16px 32px', fontSize: '16px', fontWeight: '600', fontFamily: "'Montserrat', sans-serif", cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px rgba(33, 44, 89, 0.1)', transition: 'all 0.3s ease' }} onMouseEnter={(e) => { e.target.style.background = '#212c59'; e.target.style.color = 'white'; e.target.style.borderColor = '#0d1220'; }} onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#212c59'; e.target.style.borderColor = '#212c59'; }}>Close</button>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      {!showAdd && !showEdit && !showDelete && !showAddSuccessModal && !showEditSuccessModal && !showDeleteSuccessModal && (
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
