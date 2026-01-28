import React, { useState, useEffect, useCallback } from 'react';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const AnalyticsDisplay = () => {
  const [employmentSpendingData, setEmploymentSpendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch employment spending data
      const employmentRes = await fetch(`${API_BASE}/api/analytics/highest-spenders-by-employment`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let employmentData = [];
      
      if (employmentRes.ok) {
        employmentData = await employmentRes.json();
      }

      setEmploymentSpendingData(employmentData);

    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(`Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const analyticsInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(analyticsInterval);
  }, [fetchAnalyticsData]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading average spent analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'red' }}>
        <div>{error}</div>
        <button 
          onClick={fetchAnalyticsData}
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            background: '#003466', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="analytics-display">
      {/* Highest Spenders by Employment Status */}
      {employmentSpendingData.length > 0 ? (
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#003466' }}>Spending Analysis: Employed vs Students</h4>
          
          {/* Summary Comparison */}
          {employmentSpendingData.length >= 2 && (
            <div style={{
              background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              border: '1px solid #e1bee7'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h5 style={{ margin: 0, color: '#003466' }}>Total Spending Comparison</h5>
                <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                  {employmentSpendingData[0].totalSpent > employmentSpendingData[1].totalSpent ? (
                    <span style={{ color: '#1976d2', fontWeight: '600' }}>
                      {employmentSpendingData[0].employmentStatus} spend {(((employmentSpendingData[0].totalSpent - employmentSpendingData[1].totalSpent) / employmentSpendingData[1].totalSpent) * 100).toFixed(0)}% more
                    </span>
                  ) : (
                    <span style={{ color: '#7b1fa2', fontWeight: '600' }}>
                      {employmentSpendingData[1].employmentStatus} spend {(((employmentSpendingData[1].totalSpent - employmentSpendingData[0].totalSpent) / employmentSpendingData[0].totalSpent) * 100).toFixed(0)}% more
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {employmentSpendingData.map((category, index) => (
                  <div key={index} style={{
                    background: '#fff',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {category.employmentStatus === 'Employed' ? (
                        <FaBriefcase style={{ color: '#1976d2' }} />
                      ) : (
                        <FaGraduationCap style={{ color: '#7b1fa2' }} />
                      )}
                      <span style={{ fontWeight: '600', color: '#003466' }}>{category.employmentStatus}</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2e7d32' }}>
                      ₱{category.totalSpent.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                      {category.userCount} users • {category.totalOrders} orders • Avg: ₱{category.averageSpent.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Total Spending by Employment Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {employmentSpendingData.map((category, index) => (
              <div key={index} style={{
                background: '#fff',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  {category.employmentStatus === 'Employed' ? (
                    <FaBriefcase style={{ color: '#1976d2', fontSize: '1.5rem' }} />
                  ) : (
                    <FaGraduationCap style={{ color: '#7b1fa2', fontSize: '1.5rem' }} />
                  )}
                  <h5 style={{ margin: 0, color: '#003466', fontSize: '1.1rem' }}>{category.employmentStatus}</h5>
                </div>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2e7d32' }}>
                  ₱{category.totalSpent.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#003466' }}>Spending Analysis: Employed vs Students</h4>
          <div style={{ color: '#6c757d', fontSize: '0.9rem' }}>
            No spending data available for employed users or students yet.
            <br />
            <small style={{ fontSize: '0.8rem', color: '#999' }}>
              This could mean no users have employment status "Employed" or "Student", or no completed orders exist.
            </small>
          </div>
        </div>
      )}


      <style jsx>{`
        .analytics-display {
          padding: 1rem;
        }
        
        @media (max-width: 768px) {
          .analytics-display {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDisplay;
