import React, { useState, useEffect } from 'react';
import { FaEye, FaReply, FaClock, FaCheckCircle, FaStar, FaSpinner, FaCog } from 'react-icons/fa';
import { MessageSquare } from 'lucide-react';
import { MdNotifications } from 'react-icons/md';
import { X } from 'lucide-react';
import PageHeader from './components/PageHeader';

const CustomerFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (showReplyModal) {
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
  }, [showReplyModal]);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch feedback data
  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
      
      const response = await fetch(`${API_URL}/api/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch feedback');
      }
    } catch (err) {

      setError('Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  // Handle reply submission
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    if (!replyMessage.trim()) {
      setModalError('Please enter a reply message');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const API_URL = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
      
      const response = await fetch(`${API_URL}/api/feedback/reply/${selectedFeedback._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reply: replyMessage })
      });

      if (response.ok) {
        const data = await response.json();
        // Success - close modal and reset
        setShowReplyModal(false);
        setSelectedFeedback(null);
        setReplyMessage('');
        setModalError('');
        
        // Update local state
        setFeedback(prev => prev.map(item => 
          item._id === selectedFeedback._id 
            ? { ...item, status: 'replied', reply: replyMessage, repliedAt: new Date() }
            : item
        ));
        
        // Dispatch event to update recent activity
        window.dispatchEvent(new CustomEvent('adminAction', { 
          detail: { action: 'feedback_replied', customer: selectedFeedback.name } 
        }));
      } else {
        const errorData = await response.json();
        setModalError(errorData.message || 'Failed to send reply');
      }
    } catch (err) {
      setModalError('Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  // Open reply modal
  const openReplyModal = (feedbackItem) => {
    setSelectedFeedback(feedbackItem);
    setReplyMessage('');
    setModalError(''); // Clear any previous errors
    setShowReplyModal(true);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    // Get status badge
  const getStatusBadge = (status) => {
    if (status === 'replied') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          padding: '0.375rem 0.75rem',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
          background: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb'
        }}>
          <FaCheckCircle size={12} />
          REPLIED
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.375rem 0.75rem',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
        background: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeaa7'
      }}>
        <FaClock size={12} />
        PENDING
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #212c59',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p style={{color: '#212c59', fontSize: '16px', margin: '0'}}>Loading feedback...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#dc3545'
      }}>
        <p style={{fontSize: '16px', marginBottom: '20px'}}>{error}</p>
                 <button 
           onClick={fetchFeedback}
           style={{
             background: '#212c59',
             color: 'white',
             border: '2px solid #b08d57',
             padding: '10px 20px',
             borderRadius: '8px',
             cursor: 'pointer',
             fontWeight: '600',
             transition: 'all 0.2s ease'
           }}
           onMouseOver={(e) => e.target.style.background = '#1e3a8a'}
           onMouseOut={(e) => e.target.style.background = '#212c59'}
         >
           Try Again
         </button>
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
        title="Customer Feedback" 
        icon={MessageSquare}
      />
      
      {/* Stats Cards */}
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem'
      }}>
        {/* Total Feedback */}
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
        }}>
          <div style={{
            fontSize: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            background: '#fce4ec',
            color: '#c2185b'
          }}>
            <FaStar />
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: '0.9rem',
              color: '#6c757d',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Total Feedback
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#212c59'
            }}>
              {feedback.length}
            </div>
          </div>
        </div>

        {/* Pending Feedback */}
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
        }}>
          <div style={{
            fontSize: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            background: '#fff3e0',
            color: '#f57c00'
          }}>
            <FaClock />
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: '0.9rem',
              color: '#6c757d',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Pending Feedback
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#212c59'
            }}>
              {feedback.filter(f => f.status === 'pending').length}
            </div>
          </div>
        </div>

        {/* Replied by Admin */}
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)';
        }}>
          <div style={{
            fontSize: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            background: '#e8f5e8',
            color: '#2e7d32'
          }}>
            <MdNotifications />
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: '0.9rem',
              color: '#6c757d',
              fontWeight: '500',
              marginBottom: '0.5rem'
            }}>
              Replied by Admin
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#212c59'
            }}>
              {feedback.filter(f => f.status === 'replied').length}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Refresh */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: '1.5rem',
        gap: '1rem'
      }}>
        <button 
          onClick={fetchFeedback} 
          style={{
            background: 'white',
            color: '#212c59',
            border: '2px solid #212c59',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 8px rgba(33, 44, 89, 0.3)'
          }}
          onMouseOver={(e) => {
            e.target.style.background = '#212c59';
            e.target.style.color = 'white';
            e.target.style.borderColor = '#212c59';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 6px 12px rgba(33, 44, 89, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'white';
            e.target.style.color = '#212c59';
            e.target.style.borderColor = '#212c59';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 8px rgba(33, 44, 89, 0.3)';
          }}
        >
          <FaSpinner style={{ color: 'inherit', pointerEvents: 'none' }} />
          Refresh
        </button>
      </div>

      {/* Professional Feedback Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        marginBottom: '4rem'
      }}>

        {feedback.length === 0 ? (
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
              <MessageSquare />
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#212c59',
              margin: '0 0 0.5rem 0'
            }}>
              No feedback received yet
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#64748b',
              margin: '0',
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Customer feedback will appear here once customers start submitting reviews and suggestions.
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              background: '#212c59',
              padding: '1.5rem 2rem',
              borderBottom: '2px solid #b08d57',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1.5fr 2fr 1fr 1fr 1fr',
              gap: '1rem',
              alignItems: 'center',
              fontWeight: '700',
              fontSize: '0.9rem',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaStar style={{ color: '#b08d57', fontSize: '1rem' }} />
                CUSTOMER
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare style={{ color: '#b08d57', fontSize: '1rem' }} />
                EMAIL
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaReply style={{ color: '#b08d57', fontSize: '1rem' }} />
                MESSAGE
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
                <FaClock style={{ color: '#b08d57', fontSize: '1rem' }} />
                DATE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <FaCog style={{ color: '#b08d57', fontSize: '1rem' }} />
                ACTIONS
              </div>
            </div>

            {/* Table Rows */}
            {feedback.map((item, index) => (
              <div
                key={item._id}
                style={{
                  padding: '1.5rem 2rem',
                  borderBottom: index < feedback.length - 1 ? '1px solid #f1f5f9' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1.5fr 2fr 1fr 1fr 1fr',
                  gap: '1rem',
                  alignItems: 'center',
                  transition: 'background-color 0.2s ease',
                  cursor: 'pointer',
                  minHeight: '80px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* CUSTOMER Column */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '700',
                    color: '#212c59'
                  }}>
                    {item.name}
                  </div>
                </div>

                {/* EMAIL Column */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                  fontSize: '0.9rem',
                  color: '#64748b',
                  lineHeight: '1.4'
                }}>
                  {item.email}
                </div>

                {/* MESSAGE Column */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: '0.9rem',
                  color: '#495057',
                  lineHeight: '1.4'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    {item.message.length > 100 
                      ? `${item.message.substring(0, 100)}...` 
                      : item.message
                    }
                  </div>
                  {item.message.length > 100 && (
                    <button 
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#212c59',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '0',
                        fontWeight: '600',
                        alignSelf: 'flex-start'
                      }}
                      onClick={() => alert(`Full message:\n\n${item.message}`)}
                    >
                      View Full
                    </button>
                  )}
                </div>

                {/* STATUS Column */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  {getStatusBadge(item.status)}
                </div>

                {/* DATE Column */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '100%',
                  fontSize: '0.85rem',
                  color: '#6c757d',
                  lineHeight: '1.4'
                }}>
                  {formatDate(item.createdAt)}
                </div>

                {/* ACTIONS Column */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <button
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
                    onClick={async () => {
                      if (item.status === 'replied') {
                        // Get admin name from JWT token and fetch full name from server
                        let adminName = 'Admin';
                        try {
                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          if (token) {
                            const payload = JSON.parse(atob(token.split('.')[1]));
                            const userId = payload.userId;
                            
                            // Fetch admin details from server to get fullName
                            const response = await fetch(`/api/admins/${userId}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              }
                            });
                            
                            if (response.ok) {
                              const adminData = await response.json();
                              adminName = adminData.fullName || adminData.name || 'Admin';
                            } else {
                              // Fallback to email if API call fails
                              adminName = payload.email || 'Admin';
                            }
                          }
                        } catch (err) {
                          console.error('Error getting admin name:', err);
                          // Final fallback
                          adminName = 'Admin';
                        }
                        alert(`${adminName.toUpperCase()} REPLY:\n\n${item.reply}\n\nReplied on: ${formatDate(item.repliedAt)}`);
                      } else {
                        alert('No admin reply yet. Status: Pending Reply');
                      }
                    }}
                    title="View Admin Reply"
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
                    <FaEye />
                  </button>
                  {item.status === 'pending' && (
                    <button
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        color: 'white',
                        background: '#28a745',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        fontSize: '0.875rem',
                        boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)'
                      }}
                      onClick={() => openReplyModal(item)}
                      title="Reply to Feedback"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#218838';
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 4px 8px rgba(40, 167, 69, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#28a745';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 2px 4px rgba(40, 167, 69, 0.3)';
                      }}
                    >
                      <FaReply />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedFeedback && (
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
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: 'calc(100vh - 40px)',
            overflow: 'auto',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e9ecef'
            }}>
              <h3 style={{margin: 0, color: '#212c59', fontWeight: '700'}}>Reply to Feedback</h3>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => {
                  setShowReplyModal(false);
                  setModalError('');
                }}
                onMouseOver={(e) => e.target.style.background = '#f8f9fa'}
                onMouseOut={(e) => e.target.style.background = 'none'}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{marginBottom: '20px'}}>
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '12px',
                borderLeft: '3px solid #212c59'
              }}>
                <strong style={{color: '#212c59'}}>From:</strong> {selectedFeedback.name} ({selectedFeedback.email})
              </div>
              <div style={{
                background: '#f8f9fa',
                padding: '12px',
                borderRadius: '8px',
                borderLeft: '3px solid #28a745'
              }}>
                <strong style={{color: '#212c59'}}>Message:</strong>
                <div style={{marginTop: '8px', color: '#495057', lineHeight: '1.5'}}>{selectedFeedback.message}</div>
              </div>
            </div>

            <form onSubmit={handleReplySubmit}>
              {/* Error Display inside Reply Modal */}
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
              
              <div style={{marginBottom: '20px'}}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#212c59'
                }}>
                  Your Reply:
                </label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Montserrat, sans-serif',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                  required
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your reply here..."
                />
              </div>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                                                                   <button
                    type="button"
                    style={{
                      background: 'white',
                      color: '#212c59',
                      border: '2px solid #212c59',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setShowReplyModal(false);
                      setModalError('');
                    }}
                    disabled={submitting}
                    onMouseOver={(e) => !submitting && (e.target.style.background = '#f8f9fa')}
                    onMouseOut={(e) => !submitting && (e.target.style.background = 'white')}
                  >
                    Cancel
                  </button>
                                 <button
                   type="submit"
                   style={{
                     background: '#212c59',
                     color: 'white',
                     border: '2px solid #b08d57',
                     padding: '10px 20px',
                     borderRadius: '8px',
                     cursor: 'pointer',
                     fontWeight: '600',
                     transition: 'all 0.2s ease'
                   }}
                   disabled={submitting}
                   onMouseOver={(e) => !submitting && (e.target.style.background = '#1e3a8a')}
                   onMouseOut={(e) => !submitting && (e.target.style.background = '#212c59')}
                 >
                   {submitting ? 'Sending...' : 'Send Reply'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerFeedback;
