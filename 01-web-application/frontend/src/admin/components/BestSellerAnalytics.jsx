import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const BestSellerAnalytics = ({ period = 'monthly' }) => {
  const [analyticsData, setAnalyticsData] = useState({
    topSellingItems: [],
    categorySales: [],
    detailedPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Set up axios headers
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Fetch all analytics data from separate endpoints
      const [bestSellersResponse, categoryResponse, performanceResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/best-sellers?period=${period}&limit=10`, { headers }),
        axios.get(`${API_BASE}/api/analytics/best-sellers-by-category?period=${period}&limit=10`, { headers }),
        axios.get(`${API_BASE}/api/analytics/sales-trends?period=${period}`, { headers })
      ]);
      
      // Process category data for chart - get top 10 from each category
      const categories = categoryResponse.data.categories || {};
      const categorySalesData = [];
      
      // Process Pizza, Donuts, Drinks, Pastries categories
      const targetCategories = ['Pizza', 'Donuts', 'Drinks', 'Pastries'];
      targetCategories.forEach(category => {
        if (categories[category] && categories[category].length > 0) {
          // Get top 10 items from this category
          const topItems = categories[category].slice(0, 10);
          topItems.forEach((item, index) => {
            categorySalesData.push({
              category: category,
              itemName: item.itemName,
              totalQuantity: item.totalQuantity,
              totalOrders: item.totalOrders,
              rank: index + 1
            });
          });
        }
      });

      setAnalyticsData({
        topSellingItems: bestSellersResponse.data.bestSellers || [],
        categorySales: categorySalesData,
        detailedPerformance: performanceResponse.data.trends || []
      });
    } catch (err) {
      console.error('Analytics fetch error:', err);
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
  const BEST_SELLER_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#9c27b0', '#f44336', '#4caf50', '#ff9800', '#2196f3'];
  const CATEGORY_COLORS = {
    'Pizza': '#ff7300',
    'Donuts': '#ffc658', 
    'Drinks': '#00C49F',
    'Pastries': '#8884d8'
  };

  return (
    <div className="analytics-container">
      {/* Content Wrapper for Centering */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Charts Grid */}
        <div className="charts-grid" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
          {/* Top 10 Best Selling Items */}
          <div className="chart-card">
            <h4>Top 10 Best Selling Items</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analyticsData.topSellingItems} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="itemName" 
                  type="category"
                  tickFormatter={(value) => {
                    // Truncate long names
                    return value.length > 12 ? value.substring(0, 12) + '...' : value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Total Quantity']}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Bar dataKey="totalQuantity" fill="#8884d8">
                  {analyticsData.topSellingItems.map((entry, index) => (
                    <Bar key={`bar-${index}`} fill={BEST_SELLER_COLORS[index % BEST_SELLER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 10 Best Sellers by Category */}
          <div className="chart-card">
            <h4>Top 10 Best Sellers by Category</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analyticsData.categorySales} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="itemName" 
                  type="category"
                  tickFormatter={(value) => {
                    // Truncate long names
                    return value.length > 10 ? value.substring(0, 10) + '...' : value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, 'Total Quantity']}
                  labelFormatter={(label) => `Product: ${label}`}
                />
                <Bar dataKey="totalQuantity" fill="#00C49F">
                  {analyticsData.categorySales.map((entry, index) => (
                    <Bar key={`bar-${index}`} fill={CATEGORY_COLORS[entry.category] || '#8884d8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Performance */}
          <div className="chart-card">
            <h4>Detailed Performance ({period})</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.detailedPerformance} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
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
                  formatter={(value, name) => [value, 'Total Quantity']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Bar dataKey="totalQuantity" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestSellerAnalytics;