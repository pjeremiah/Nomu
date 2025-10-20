import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BestSellerAnalytics = ({ period = 'monthly' }) => {
  const [analyticsData, setAnalyticsData] = useState({
    bestSellers: [],
    categorySales: [],
    salesTrend: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/analytics/bestsellers?period=${period}`);
      setAnalyticsData(response.data);
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h3>Best Seller Analytics</h3>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
        <h3>Best Seller Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchAnalytics} style={{ marginTop: '10px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  // Color schemes for different charts
  const BEST_SELLER_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];
  const CATEGORY_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF7300', '#8884d8'];

  return (
    <div className="analytics-container">
      {/* Content Wrapper for Centering */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Charts Grid */}
        <div className="charts-grid" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
          {/* Best Sellers */}
          <div className="chart-card">
            <h4>Top Best Sellers</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.bestSellers} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  type="category"
                  tickFormatter={(value) => {
                    // Truncate long names
                    return value.length > 15 ? value.substring(0, 15) + '...' : value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Sales Count']}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Bar dataKey="salesCount" fill="#8884d8">
                  {analyticsData.bestSellers.map((entry, index) => (
                    <Bar key={`bar-${index}`} fill={BEST_SELLER_COLORS[index % BEST_SELLER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Sales */}
          <div className="chart-card">
            <h4>Sales by Category</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.categorySales} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="category" 
                  type="category"
                  tickFormatter={(value) => {
                    // Truncate long category names
                    return value.length > 12 ? value.substring(0, 12) + '...' : value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Sales Count']}
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Bar dataKey="salesCount" fill="#00C49F">
                  {analyticsData.categorySales.map((entry, index) => (
                    <Bar key={`bar-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Trend */}
          <div className="chart-card">
            <h4>Sales Trend ({period})</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.salesTrend} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  type="category"
                  tickFormatter={(value) => {
                    // Format date if it's a date string
                    if (value.includes('-')) {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                    return value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Sales Count']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Bar dataKey="salesCount" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestSellerAnalytics;