import React, { useState, useEffect, useCallback } from 'react';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const AnalyticsDisplay = () => {
  const [analyticsData, setAnalyticsData] = useState({
    averageSpentPerUser: 0,
    totalUsers: 0,
    totalOrders: 0,
    usersList: []
  });
  const [employmentSpendingData, setEmploymentSpendingData] = useState([]);
  const [topSpendersData, setTopSpendersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch dashboard stats which includes averageSpent
      const dashboardStatsRes = await fetch(`${API_BASE}/api/analytics/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!dashboardStatsRes.ok) throw new Error(`Dashboard stats failed: ${dashboardStatsRes.status}`);

      const dashboardStats = await dashboardStatsRes.json();

      // Calculate average spent per user (not per order)
      const averageSpentPerUser = dashboardStats.averageSpent || 0;
      const totalUsers = dashboardStats.totalCustomers || 0;
      const totalOrders = dashboardStats.totalOrders || 0; // Real total orders from orders collection

      // Fetch users with spending data, employment spending data, and top spenders in parallel
      const [usersRes, employmentRes, topSpendersRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/users-with-spending`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/analytics/highest-spenders-by-employment`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/analytics/top-spenders-by-employment`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      let usersList = [];
      let employmentData = [];
      let topSpenders = [];
      
      if (usersRes.ok) {
        usersList = await usersRes.json();
      }
      
      if (employmentRes.ok) {
        employmentData = await employmentRes.json();
        console.log('Employment data:', employmentData);
      } else {
        console.error('Employment data fetch failed:', employmentRes.status);
      }

      if (topSpendersRes.ok) {
        topSpenders = await topSpendersRes.json();
        console.log('Top spenders data:', topSpenders);
      } else {
        console.error('Top spenders fetch failed:', topSpendersRes.status);
      }

      setAnalyticsData({
        averageSpentPerUser,
        totalUsers,
        totalOrders,
        usersList
      });
      setEmploymentSpendingData(employmentData);
      setTopSpendersData(topSpenders);

    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(`Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAnalyticsData();
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
      {/* Highest Individual Spenders by Employment Status */}
      {topSpendersData.length > 0 ? (
        <div style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#003466' }}>Highest Individual Amount Spent: Employed vs Students</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {topSpendersData.map((item, index) => (
              <div key={index} style={{
                background: '#fff',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '2px solid',
                borderColor: item.employmentStatus === 'Employed' ? '#1976d2' : '#7b1fa2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  {item.employmentStatus === 'Employed' ? (
                    <FaBriefcase style={{ color: '#1976d2', fontSize: '1.5rem' }} />
                  ) : (
                    <FaGraduationCap style={{ color: '#7b1fa2', fontSize: '1.5rem' }} />
                  )}
                  <h5 style={{ margin: 0, color: '#003466', fontSize: '1.1rem' }}>{item.employmentStatus}</h5>
                </div>
                
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: item.employmentStatus === 'Employed' ? '#1976d2' : '#7b1fa2', marginBottom: '0.5rem' }}>
                  ₱{item.topSpender.totalSpent.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                  Highest individual amount
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
          <h4 style={{ margin: '0 0 1rem 0', color: '#003466' }}>Highest Individual Amount Spent: Employed vs Students</h4>
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
