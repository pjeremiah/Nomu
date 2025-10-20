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

  return (
    <div style={{ padding: '20px', background: '#fff' }}>
      {/* Top Selling Items Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '10px', color: '#333' }}>Top Selling Items</h3>
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>Ranked by quantity sold</p>
        
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analyticsData.topSellingItems} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="itemName" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="totalOrders" fill="#4CAF50" name="Orders" />
              <Bar dataKey="totalQuantity" fill="#2196F3" name="Quantity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best Sellers by Category Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '10px', color: '#333' }}>Best Sellers by Category</h3>
        <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>Top items per category</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Pizzas */}
          <div>
            <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '16px' }}>Pizzas</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.categorySales.filter(item => item.category === 'Pizza')} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="itemName" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="totalQuantity" fill="#9C27B0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donuts */}
          <div>
            <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '16px' }}>Donuts</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.categorySales.filter(item => item.category === 'Donuts')} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="itemName" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="totalQuantity" fill="#9C27B0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Drinks */}
          <div>
            <h4 style={{ marginBottom: '10px', color: '#333', fontSize: '16px' }}>Drinks</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.categorySales.filter(item => item.category === 'Drinks')} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="itemName" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="totalQuantity" fill="#9C27B0" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Performance Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#333' }}>Detailed Performance</h3>
          <a href="#" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>Complete item statistics</a>
        </div>
        
        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: '14px', fontWeight: '600' }}>Rank</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: '14px', fontWeight: '600' }}>Item Name</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: '14px', fontWeight: '600' }}>Quantity</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: '14px', fontWeight: '600' }}>Orders</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: '14px', fontWeight: '600' }}>Customers</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', fontSize: '14px', fontWeight: '600' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.topSellingItems.map((item, index) => {
                const rankColors = ['#FFC107', '#6C757D', '#FF9800', '#6C757D', '#6C757D', '#6C757D', '#6C757D', '#6C757D', '#6C757D', '#6C757D'];
                const share = analyticsData.topSellingItems.length > 0 ? 
                  ((item.totalQuantity / analyticsData.topSellingItems.reduce((sum, i) => sum + i.totalQuantity, 0)) * 100).toFixed(2) : '0.00';
                
                return (
                  <tr key={index} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%', 
                        background: rankColors[index], 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        margin: '0 auto'
                      }}>
                        {index + 1}
                      </div>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{item.itemName}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{item.totalQuantity}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{item.totalOrders}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{item.uniqueCustomers || 1}</td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>{share}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BestSellerAnalytics;