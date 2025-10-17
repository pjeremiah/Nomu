import React, { useState, useEffect, useCallback } from 'react';
import { FaChartBar, FaChartLine, FaUsers, FaCoffee, FaStar, FaClock, FaSpinner, FaTag, FaExclamationTriangle } from 'react-icons/fa';
import { BarChart3 } from 'lucide-react';
import { MdTrendingUp } from 'react-icons/md';
import Pagination from 'react-bootstrap/Pagination';
import CustomerAnalytics from './components/CustomerAnalytics';
import BestSellerAnalytics from './components/BestSellerAnalytics';
import EnhancedDropdown from './components/EnhancedDropdown';
import PageHeader from './components/PageHeader';

const StatCard = ({ title, value, icon: Icon, color, subtitle, loading = false, showDropdown = false, dropdownValue = 'monthly', onDropdownChange = null }) => (
  <div className="stat-card" style={{
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
  }}>
    <div className="stat-icon" style={{
      fontSize: '1.2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      background: color.background,
      color: color.text
    }}>
      <Icon />
    </div>
    <div className="stat-info" style={{ flex: 1, textAlign: 'center' }}>
      <div className="stat-label" style={{
        fontSize: '0.8rem',
        color: '#6c757d',
        fontWeight: '500',
        marginBottom: '0.5rem'
      }}>
        {title}
      </div>
      <div className="stat-value" style={{
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
          value
        )}
      </div>
    </div>
    {showDropdown && onDropdownChange && (
      <div style={{ marginLeft: 'auto' }}>
        <EnhancedDropdown
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: 'Yearly' }
          ]}
          value={dropdownValue}
          onChange={onDropdownChange}
          minWidth="120px"
          variant="compact"
        />
      </div>
    )}
  </div>
);

const InfoCard = ({ title, children, icon: Icon, color = '#003466', extraContent = null, style = {} }) => (
  <div style={{
    background: '#fff',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    marginBottom: '1rem',
    border: '1px solid #e9ecef',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    ...style
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
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.75rem',
      paddingBottom: '0.5rem',
      borderBottom: '1px solid #e9ecef'
    }}>
      <div style={{
        color: color,
        fontSize: '1.25rem'
      }}>
        <Icon />
      </div>
      <h3 style={{
        fontWeight: '700',
        color: '#212c59',
        fontSize: '1.1rem',
        margin: '0'
      }}>
        {title}
      </h3>
      {extraContent}
    </div>
    {children}
  </div>
);

const AdminHome = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalFeedback: 0,
    pendingFeedback: 0,
    totalMenuItems: 0,
    activeMenuItems: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bestSellersPeriod, setBestSellersPeriod] = useState('monthly');
  
  // Abuse alert states
  const [abuseAlerts, setAbuseAlerts] = useState([]);
  const [abuseAlertStats, setAbuseAlertStats] = useState({});
  
  
  // Pagination state for recent activity
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const activitiesPerPage = 10;

  const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

  // Pagination calculations for recent activity
  const totalActivityPages = Math.ceil(recentActivity.length / activitiesPerPage) || 1;
  const paginatedActivities = recentActivity.slice(
    (activityCurrentPage - 1) * activitiesPerPage,
    activityCurrentPage * activitiesPerPage
  );

  const handleActivityPageChange = (pageNumber) => {
    setActivityCurrentPage(pageNumber);
  };

  const fetchRecentActivity = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/analytics/recent-activity`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const activityData = await response.json();
        setRecentActivity(activityData);
        // Reset to first page when new data is fetched
        setActivityCurrentPage(1);
      }
    } catch (err) {
      // Silent fail for background refresh
    }
  }, [API_BASE]);

  const fetchAbuseAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/abuse-alerts/recent?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const alertsData = await response.json();
        setAbuseAlerts(alertsData);
      }
    } catch (err) {
      console.error('Error fetching abuse alerts:', err);
    }
  }, [API_BASE]);

  const fetchAbuseAlertStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/api/abuse-alerts/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setAbuseAlertStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching abuse alert stats:', err);
    }
  }, [API_BASE]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch dashboard stats and recent activity in parallel
      const [statsResponse, activityResponse] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/dashboard-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_BASE}/api/analytics/recent-activity`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch dashboard stats: ${statsResponse.status}`);
      }

      if (!activityResponse.ok) {
        throw new Error(`Failed to fetch recent activity: ${activityResponse.status}`);
      }

      const [statsData, activityData] = await Promise.all([
        statsResponse.json(),
        activityResponse.json()
      ]);

      setStats(statsData);
      setRecentActivity(activityData);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);


  useEffect(() => {
    fetchDashboardData();
    fetchAbuseAlerts();
    fetchAbuseAlertStats();
    
    // Set up auto-refresh for recent activity every 30 seconds
    const activityInterval = setInterval(() => {
      fetchRecentActivity();
    }, 30000); // 30 seconds - optimal balance between real-time feel and performance
    
    // Set up auto-refresh for dashboard stats every 2 minutes
    const statsInterval = setInterval(() => {
      fetchDashboardData();
    }, 120000); // 2 minutes - stats don't change rapidly
    
    // Set up auto-refresh for abuse alerts every 30 seconds
    const abuseAlertsInterval = setInterval(() => {
      fetchAbuseAlerts();
      fetchAbuseAlertStats();
    }, 30000); // 30 seconds - same as activity for consistency
    
    const inventoryInterval = setInterval(() => {
    }, 15000); // 15 seconds - more frequent for real-time inventory updates
    
    // Listen for admin action events to refresh activity immediately
    const handleAdminAction = () => {
      fetchRecentActivity();
    };
    
    const handleInventoryUpdate = () => {
    };
    
    window.addEventListener('adminAction', handleAdminAction);
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    
    return () => {
      clearInterval(activityInterval);
      clearInterval(statsInterval);
      clearInterval(abuseAlertsInterval);
      clearInterval(inventoryInterval);
      window.removeEventListener('adminAction', handleAdminAction);
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
    };
  }, [fetchDashboardData, fetchRecentActivity, fetchAbuseAlerts, fetchAbuseAlertStats]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user':
        return <FaUsers style={{ fontSize: '0.8rem' }} />;
      case 'feedback':
        return <FaStar style={{ fontSize: '0.8rem' }} />;
      case 'menu':
        return <FaCoffee style={{ fontSize: '0.8rem' }} />;
      case 'admin':
        return <FaUsers style={{ fontSize: '0.8rem' }} />;
      case 'promo':
        return <FaTag style={{ fontSize: '0.8rem' }} />;
      case 'reward':
        return <FaStar style={{ fontSize: '0.8rem' }} />;
      default:
        return <FaChartBar style={{ fontSize: '0.8rem' }} />;
    }
  };


  const getActivityColor = (type) => {
    switch (type) {
      case 'user':
        return '#1976d2';
      case 'feedback':
        return '#c2185b';
      case 'menu':
        return '#388e3c';
      case 'admin':
        return '#ff9800';
      case 'promo':
        return '#9c27b0';
      case 'reward':
        return '#ff5722';
      default:
        return '#4caf50';
    }
  };

  // Helper functions for abuse alerts
  const getAbuseSeverityColor = (severity) => {
    switch (severity) {
      case 'LOW': return '#FFA500';
      case 'MEDIUM': return '#FF8C00';
      case 'HIGH': return '#FF4500';
      case 'CRITICAL': return '#DC143C';
      default: return '#FF8C00';
    }
  };

  const getAbuseTypeIcon = (abuseType) => {
    switch (abuseType) {
      case 'repeated_scans': return <FaUsers />;
      case 'rapid_fire': return <FaClock />;
      case 'unusual_hours': return <FaClock />;
      default: return <FaUsers />;
    }
  };

  const formatAbuseAlert = (alert) => {
    const time = new Date(alert.createdAt).toLocaleTimeString();
    const severity = alert.severity || 'MEDIUM';
    const abuseType = alert.abuseType || 'unknown';
    const message = alert.message || 'Abuse detected';
    
    return { time, severity, message, abuseType };
  };

  // Add error boundary fallback
  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: '#fff5f5',
          border: '1px solid #fed7d7',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px'
        }}>
          <FaExclamationTriangle style={{
            fontSize: '2rem',
            color: '#e53e3e',
            marginBottom: '1rem'
          }} />
          <h3 style={{
            color: '#c53030',
            marginBottom: '1rem',
            fontSize: '1.25rem'
          }}>
            Error Loading Dashboard
          </h3>
          <p style={{
            color: '#742a2a',
            marginBottom: '1.5rem',
            lineHeight: '1.5'
          }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      fontFamily: 'Montserrat, sans-serif',
      color: '#212c59',
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      {/* Page Header */}
      <PageHeader 
        title="Admin Dashboard" 
        icon={BarChart3}
      />

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#ffebee',
          color: '#c62828',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #ef9a9a'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}
      className="stats-grid">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers.toLocaleString()}
          icon={FaUsers}
          color={{ background: '#e3f2fd', text: '#1976d2' }}
          loading={loading}
        />
        <StatCard
          title="Active Menu Items"
          value={stats.activeMenuItems}
          icon={FaCoffee}
          color={{ background: '#f3e5f5', text: '#7b1fa2' }}
          loading={loading}
        />
        <StatCard
          title="Pending Feedback"
          value={stats.pendingFeedback}
          icon={FaClock}
          color={{ background: '#fff3e0', text: '#f57c00' }}
          loading={loading}
        />
        <StatCard
          title="Total Feedback"
          value={stats.totalFeedback}
          icon={FaStar}
          color={{ background: '#fce4ec', text: '#c2185b' }}
          loading={loading}
        />
      </div>


      
      {/* Customer Analytics Section */}
      <InfoCard 
        title="Customer Analytics" 
        icon={FaChartBar}
        style={{ marginBottom: '1rem' }}
      >
        <CustomerAnalytics />
      </InfoCard>

      {/* Best Seller Analytics Section */}
      <InfoCard 
        title="Best Seller Analytics" 
        icon={FaChartLine}
        extraContent={
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginLeft: 'auto'
          }}>
            <span style={{
              fontSize: '0.85rem',
              color: '#6c757d',
              fontWeight: '500'
            }}>
              Period:
            </span>
            <EnhancedDropdown
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'yearly', label: 'Yearly' }
              ]}
              value={bestSellersPeriod}
              onChange={setBestSellersPeriod}
              minWidth="120px"
              variant="compact"
            />
          </div>
        }
      >
        <BestSellerAnalytics period={bestSellersPeriod} />
      </InfoCard>

      
      {/* Security Alerts */}
      <InfoCard title="Security Alerts" icon={FaUsers} color="#d32f2f">
        <div style={{
          padding: '1rem',
          background: abuseAlerts.length > 0 
            ? 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'
            : 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
          borderRadius: '8px',
          border: abuseAlerts.length > 0 
            ? '1px solid #ef9a9a'
            : '1px solid #a5d6a7'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: abuseAlerts.length > 0 ? '#c62828' : '#2e7d32'
            }}>
              {abuseAlerts.length > 0 ? (
                <FaUsers style={{ fontSize: '1.1rem' }} />
              ) : (
                <FaUsers style={{ fontSize: '1.1rem' }} />
              )}
              <span style={{ fontWeight: '500' }}>
                {abuseAlerts.length > 0 
                  ? `${abuseAlerts.length} Security Alert${abuseAlerts.length > 1 ? 's' : ''}`
                  : 'All systems secure'
                }
              </span>
            </div>
            {abuseAlertStats.new > 0 && (
              <div style={{
                background: '#f44336',
                color: 'white',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                {abuseAlertStats.new}
              </div>
            )}
          </div>
          
          {abuseAlerts.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {abuseAlerts.slice(0, 5).map((alert, index) => {
                const { time, severity, message, abuseType } = formatAbuseAlert(alert);
                return (
                  <div key={index} style={{
                    background: 'rgba(255,255,255,0.7)',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '0.5rem',
                    border: `2px solid ${getAbuseSeverityColor(severity)}`,
                    borderLeft: `4px solid ${getAbuseSeverityColor(severity)}`
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.25rem'
                    }}>
                      {getAbuseTypeIcon(abuseType)}
                      <span style={{
                        fontWeight: '600',
                        color: getAbuseSeverityColor(severity),
                        fontSize: '0.85rem'
                      }}>
                        {severity}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#666',
                        marginLeft: 'auto'
                      }}>
                        {time}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#333',
                      lineHeight: '1.3'
                    }}>
                      {message}
                    </div>
                  </div>
                );
              })}
              {abuseAlerts.length > 5 && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  +{abuseAlerts.length - 5} more alerts
                </div>
              )}
            </div>
          ) : (
            <div style={{
              fontSize: '0.9rem',
              color: '#2e7d32',
              textAlign: 'center',
              padding: '1rem 0'
            }}>
              No security issues detected. System running smoothly.
            </div>
          )}
        </div>
      </InfoCard>

      {/* Recent Activity */}
      <InfoCard title="Recent Activity" icon={MdTrendingUp} color="#388e3c">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              color: '#6c757d'
            }}>
              <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
              Loading recent activity...
            </div>
          ) : recentActivity.length > 0 ? (
            paginatedActivities.map((activity, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                background: '#f8f9fa',
                borderRadius: '6px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getActivityColor(activity.type)
                }} />
                <div style={{
                  color: getActivityColor(activity.type),
                  fontSize: '0.8rem'
                }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#212c59'
                  }}>
                    {activity.action}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#6c757d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>{activity.time}</span>
                    {activity.adminName && (
                      <>
                        <span style={{ color: '#adb5bd' }}>•</span>
                        <span style={{ color: '#6c757d', fontWeight: '500' }}>
                          by {activity.adminName}
                        </span>
                      </>
                    )}
                  </div>
                  {activity.details && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#adb5bd',
                      marginTop: '0.25rem',
                      fontStyle: 'italic'
                    }}>
                      {activity.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#6c757d',
              fontSize: '0.9rem'
            }}>
              No recent activity to display
            </div>
          )}
          
          {/* Pagination for Recent Activity */}
          {recentActivity.length > activitiesPerPage && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid #e9ecef'
            }}>
              <div style={{
                fontSize: '0.8rem',
                color: '#6c757d',
                marginBottom: '0.5rem'
              }}>
                Showing {((activityCurrentPage - 1) * activitiesPerPage) + 1} to {Math.min(activityCurrentPage * activitiesPerPage, recentActivity.length)} of {recentActivity.length} activities
              </div>
              <Pagination size="sm">
                <Pagination.Prev 
                  onClick={() => handleActivityPageChange(Math.max(1, activityCurrentPage - 1))}
                  disabled={activityCurrentPage === 1}
                />
                {[...Array(totalActivityPages).keys()].map(number => (
                  <Pagination.Item
                    key={number + 1}
                    active={number + 1 === activityCurrentPage}
                    onClick={() => handleActivityPageChange(number + 1)}
                  >
                    {number + 1}
                  </Pagination.Item>
                ))}
                <Pagination.Next 
                  onClick={() => handleActivityPageChange(Math.min(totalActivityPages, activityCurrentPage + 1))}
                  disabled={activityCurrentPage === totalActivityPages}
                />
              </Pagination>
            </div>
          )}
        </div>
      </InfoCard>

    </div>
  );
};

export default AdminHome;

// Add CSS for responsive design
const styles = `
  @media (max-width: 1200px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
  
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
  
  @media (max-width: 480px) {
    .stats-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
} 