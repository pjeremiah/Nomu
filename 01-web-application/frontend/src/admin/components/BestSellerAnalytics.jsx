import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FaChartBar, FaCoffee } from 'react-icons/fa';

const BestSellerAnalytics = ({ period = 'monthly' }) => {
  const [analyticsData, setAnalyticsData] = useState({
    bestSellers: [],
    bestSellersByCategory: { categories: {}, categoryTotals: {} }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
      
      // Test authentication first
      try {
        const testRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!testRes.ok) {
          const errorData = await testRes.json();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          throw new Error(`Authentication failed: ${testRes.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        const userData = await testRes.json();
        
        if (!['superadmin', 'manager', 'staff'].includes(userData.role)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          throw new Error('Access denied: Admin role required');
        }
      } catch (error) {
        throw error;
      }
      
      // Map frontend period values to backend expected values
      const periodMapping = {
        'daily': 'today',
        'weekly': 'week', 
        'monthly': 'month',
        'yearly': 'year'
      };
      
      const backendPeriod = periodMapping[period] || 'month';
      console.log(`Fetching best seller analytics for period: ${period} -> ${backendPeriod}`);
      
      
      // Fetch all analytics data in parallel
      const [bestSellersRes, categoryRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/best-sellers?period=${backendPeriod}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/analytics/best-sellers-by-category?period=${backendPeriod}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Check responses
      if (!bestSellersRes.ok) {
        const errorText = await bestSellersRes.text();
        console.error(`Best Sellers API failed: ${bestSellersRes.status}`, errorText);
        throw new Error(`Best Sellers API failed: ${bestSellersRes.status} - ${errorText}`);
      }
      if (!categoryRes.ok) {
        const errorText = await categoryRes.text();
        console.error(`Category API failed: ${categoryRes.status}`, errorText);
        throw new Error(`Category API failed: ${categoryRes.status} - ${errorText}`);
      }

      const [bestSellersData, categoryData] = await Promise.all([
        bestSellersRes.json(),
        categoryRes.json()
      ]);

      console.log('Best Sellers Data:', bestSellersData);
      console.log('Category Data:', categoryData);

      // Check if we have data for the selected period
      const hasData = bestSellersData.bestSellers && bestSellersData.bestSellers.length > 0;
      
      if (!hasData && (period === 'daily' || period === 'weekly')) {
        setAnalyticsData({
          bestSellers: [],
          bestSellersByCategory: { categories: {}, categoryTotals: {} },
          noDataMessage: `No sales data available for ${period} period. This might be because there were no orders during this time. Try selecting Monthly or Yearly for more comprehensive data.`
        });
      } else {
        setAnalyticsData({
          bestSellers: bestSellersData.bestSellers || [],
          bestSellersByCategory: categoryData || { categories: {}, categoryTotals: {} },
          noDataMessage: null
        });
      }
    } catch (err) {
      console.error('Error fetching best seller analytics:', err);
      
      if (err.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to the server');
      } else if (err.message.includes('401') || err.message.includes('403')) {
        setError('Authentication error: Please log in again');
      } else {
        setError(`Failed to load analytics data: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up auto-refresh every 5 minutes
    const analyticsInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 300000); // 5 minutes
    
    return () => clearInterval(analyticsInterval);
  }, [period, fetchAnalyticsData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div className="spinner" style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #003466',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading best seller analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#d32f2f' }}>
        <div style={{ marginBottom: '15px', fontSize: '16px' }}>{error}</div>
        <button 
          onClick={fetchAnalyticsData}
          style={{ 
            padding: '10px 20px', 
            background: '#003466', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bestseller-analytics-container">
      {/* No Data Message */}
      {analyticsData.noDataMessage && (
        <div style={{
          background: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#e65100'
        }}>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            📊 No Data Available
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {analyticsData.noDataMessage}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {analyticsData.bestSellers.length > 0 && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">
              <FaCoffee style={{ color: '#1976d2' }} />
            </div>
            <div className="summary-content">
              <div className="summary-value">{analyticsData.bestSellers.length}</div>
              <div className="summary-label">Top Items</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <FaChartBar style={{ color: '#2e7d32' }} />
            </div>
            <div className="summary-content">
              <div className="summary-value">{formatNumber(analyticsData.bestSellers.reduce((sum, item) => sum + item.totalQuantity, 0))}</div>
              <div className="summary-label">Total Quantity</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Best Sellers Bar Chart */}
        {analyticsData.bestSellers.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Top Selling Items</h4>
            </div>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={analyticsData.bestSellers} margin={{ top: 10, right: 10, left: 10, bottom: 150 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="itemName" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  fontSize={11}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    formatNumber(value), 
                    name === 'totalQuantity' ? 'Quantity' : 
                    name === 'totalOrders' ? 'Orders' : name
                  ]}
                  labelFormatter={(label) => `Item: ${label}`}
                />
                <Bar dataKey="totalQuantity" fill="#1976d2" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}


        {/* Best Sellers by Category */}
        {Object.keys(analyticsData.bestSellersByCategory.categories).length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Best Sellers by Category</h4>
            </div>
            <div className="category-charts">
              {Object.entries(analyticsData.bestSellersByCategory.categories).map(([category, items]) => (
                <div key={category} className="category-section">
                  <h5 style={{ color: '#003466', marginBottom: '10px' }}>{category}</h5>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={items} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="itemName" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={10}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [formatNumber(value), 'Quantity']}
                      />
                      <Bar dataKey="totalQuantity" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Items Table */}
        {analyticsData.bestSellers.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Detailed Performance</h4>
            </div>
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Customers</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.bestSellers.map((item, index) => (
                    <tr key={item.itemName}>
                      <td className="rank-cell">
                        <div className={`rank-badge rank-${index + 1}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="item-name">{item.itemName}</td>
                      <td className="number-cell">{formatNumber(item.totalQuantity)}</td>
                      <td className="number-cell">{formatNumber(item.uniqueCustomers)}</td>
                      <td className="percentage-cell">{item.quantityPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx="true">{`
        .bestseller-analytics-container {
          padding: 0;
          width: 100%;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
          margin-top: 20px;
        }
        
        .summary-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .summary-icon {
          font-size: 24px;
          padding: 12px;
          border-radius: 8px;
          background: #f8f9fa;
        }
        
        .summary-content {
          flex: 1;
        }
        
        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #003466;
          line-height: 1;
        }
        
        .summary-label {
          font-size: 14px;
          color: #6c757d;
          margin-top: 4px;
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          padding: 0;
          width: 100%;
        }
        
        .chart-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .chart-header {
          margin-bottom: 20px;
          text-align: center;
        }
        
        .chart-header h4 {
          margin: 0 0 5px 0;
          color: #003466;
          font-size: 18px;
          font-weight: 600;
        }
        
        .chart-subtitle {
          color: #6c757d;
          font-size: 14px;
        }
        
        .category-charts {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .category-section h5 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .performance-table {
          overflow-x: auto;
        }
        
        .performance-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .performance-table th {
          background: #f8f9fa;
          color: #495057;
          font-weight: 600;
          padding: 12px 8px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
        }
        
        .performance-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .rank-cell {
          text-align: center;
          width: 60px;
        }
        
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          font-weight: 700;
          font-size: 12px;
          color: white;
        }
        
        .rank-1 { background: #FFD700; }
        .rank-2 { background: #C0C0C0; }
        .rank-3 { background: #CD7F32; }
        .rank-4, .rank-5, .rank-6, .rank-7, .rank-8, .rank-9, .rank-10 { 
          background: #6c757d; 
        }
        
        .item-name {
          font-weight: 500;
          color: #003466;
        }
        
        .number-cell, .percentage-cell {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        
        .percentage-cell {
          color: #1976d2;
          font-weight: 500;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        
        @media (max-width: 768px) {
          .bestseller-analytics-container {
            padding: 10px;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          
          .chart-card {
            padding: 15px;
          }
          
          .summary-cards {
            grid-template-columns: 1fr;
            gap: 15px;
          }
        }
        
        @media (max-width: 600px) {
          .performance-table {
            font-size: 12px;
          }
          
          .performance-table th,
          .performance-table td {
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
};

export default BestSellerAnalytics;
