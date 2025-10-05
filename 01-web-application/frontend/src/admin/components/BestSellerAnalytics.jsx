import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { FaChartBar, FaCoffee } from 'react-icons/fa';

const BestSellerAnalytics = ({ period = 'monthly' }) => {
  const [analyticsData, setAnalyticsData] = useState({
    bestSellers: [],
    bestSellersByCategory: { categories: {}, categoryTotals: {} },
    salesTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu.cafe/api';
      
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
        'monthly': 'month'
      };
      
      const backendPeriod = periodMapping[period] || 'month';
      
      // Fetch all analytics data in parallel
      const [bestSellersRes, categoryRes, trendsRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/best-sellers?period=${backendPeriod}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/analytics/best-sellers-by-category?period=${backendPeriod}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/analytics/sales-trends?period=monthly`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Check responses
      if (!bestSellersRes.ok) throw new Error(`Best Sellers API failed: ${bestSellersRes.status}`);
      if (!categoryRes.ok) throw new Error(`Category API failed: ${categoryRes.status}`);
      if (!trendsRes.ok) throw new Error(`Trends API failed: ${trendsRes.status}`);

      const [bestSellersData, categoryData, trendsData] = await Promise.all([
        bestSellersRes.json(),
        categoryRes.json(),
        trendsRes.json()
      ]);

      setAnalyticsData({
        bestSellers: bestSellersData.bestSellers || [],
        bestSellersByCategory: categoryData || { categories: {}, categoryTotals: {} },
        salesTrends: trendsData.trends || []
      });
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
              <span className="chart-subtitle">Ranked by quantity sold</span>
            </div>
            <ResponsiveContainer width="100%" height={700}>
              <BarChart data={analyticsData.bestSellers} margin={{ top: 20, right: 30, left: 20, bottom: 300 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="itemName" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
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
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ paddingTop: '60px', paddingBottom: '50px' }}
                />
                <Bar dataKey="totalQuantity" fill="#1976d2" name="Quantity" />
                <Bar dataKey="totalOrders" fill="#00C49F" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Best Sellers by Category */}
        {Object.keys(analyticsData.bestSellersByCategory.categories).length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Best Sellers by Category</h4>
              <span className="chart-subtitle">Top items per category</span>
            </div>
            <div className="category-charts">
              {Object.entries(analyticsData.bestSellersByCategory.categories).map(([category, items]) => (
                <div key={category} className="category-section">
                  <h5 style={{ color: '#003466', marginBottom: '10px' }}>{category}</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={items} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="itemName" 
                        angle={-45}
                        textAnchor="end"
                        height={60}
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

        {/* Sales Trends */}
        {analyticsData.salesTrends.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Sales Trends</h4>
              <span className="chart-subtitle">Monthly sales performance</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analyticsData.salesTrends} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'totalQuantity' ? formatNumber(value) : 
                    name === 'totalOrders' ? formatNumber(value) : value,
                    name === 'totalQuantity' ? 'Quantity' :
                    name === 'totalOrders' ? 'Orders' : name
                  ]}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  wrapperStyle={{ paddingTop: '10px' }}
                />
                <Line type="monotone" dataKey="totalQuantity" stroke="#1976d2" strokeWidth={2} name="Quantity" />
                <Line type="monotone" dataKey="totalOrders" stroke="#00C49F" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Items Table */}
        {analyticsData.bestSellers.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Detailed Performance</h4>
              <span className="chart-subtitle">Complete item statistics</span>
            </div>
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Orders</th>
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
                      <td className="number-cell">{formatNumber(item.totalOrders)}</td>
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
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 25px;
          padding: 0 20px;
        }
        
        .chart-card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid #e9ecef;
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
        @media (max-width: 768px) {
          .bestseller-analytics-container {
            padding: 15px;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .chart-card {
            padding: 20px;
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
