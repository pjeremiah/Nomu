import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CustomerAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    genderDistribution: [],
    ageRanges: [],
    employmentStatus: [],
    signupGrowth: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all analytics data from separate endpoints
      const [genderResponse, employmentResponse, ageResponse, signupResponse] = await Promise.all([
        axios.get(`${API_BASE}/api/analytics/gender`),
        axios.get(`${API_BASE}/api/analytics/employment`),
        axios.get(`${API_BASE}/api/analytics/age-ranges`),
        axios.get(`${API_BASE}/api/analytics/signup-growth`)
      ]);
      
      setAnalyticsData({
        genderDistribution: genderResponse.data,
        employmentStatus: employmentResponse.data,
        ageRanges: ageResponse.data,
        signupGrowth: signupResponse.data
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
        <h3>Customer Analytics</h3>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
        <h3>Customer Analytics</h3>
        <p>{error}</p>
        <button onClick={fetchAnalytics} style={{ marginTop: '10px', padding: '8px 16px' }}>
          Retry
        </button>
      </div>
    );
  }

  // Color schemes for different charts
  const GENDER_COLORS = ['#8884d8', '#82ca9d', '#ffc658'];
  const AGE_COLORS = ['#ff7300', '#00C49F', '#0088FE', '#FFBB28'];
  const EMPLOYMENT_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  // Helper function to ensure all categories are present
  const ensureAllCategories = (data, defaultCategories) => {
    const result = [...defaultCategories];
    data.forEach(item => {
      const existingIndex = result.findIndex(cat => cat._id === item._id);
      if (existingIndex !== -1) {
        result[existingIndex] = item;
      } else {
        result.push(item);
      }
    });
    return result;
  };

  // Process data for charts
  const genderData = ensureAllCategories(analyticsData.genderDistribution, [
    { _id: 'male', count: 0 },
    { _id: 'female', count: 0 },
    { _id: 'other', count: 0 }
  ]);

  const employmentData = ensureAllCategories(analyticsData.employmentStatus, [
    { _id: 'employed', count: 0 },
    { _id: 'unemployed', count: 0 },
    { _id: 'student', count: 0 },
    { _id: 'retired', count: 0 }
  ]);

  const ageData = ensureAllCategories(analyticsData.ageRanges, [
    { _id: '18-25', count: 0 },
    { _id: '26-32', count: 0 },
    { _id: '33-40', count: 0 },
    { _id: '41+', count: 0 }
  ]).sort((a, b) => {
    // Ensure age ranges are in ascending order
    const order = { '18-25': 1, '26-32': 2, '33-40': 3, '41+': 4 };
    return order[a._id] - order[b._id];
  });

  return (
    <div className="analytics-container">
      {/* Content Wrapper for Centering */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Charts Grid */}
        <div className="charts-grid" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        
          {/* Gender Distribution */}
          <div className="chart-card">
            <h4>Gender Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={genderData} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  type="category"
                  tickFormatter={(value) => {
                    if (value === 'male') return 'Male';
                    if (value === 'female') return 'Female';
                    if (value === 'other') return 'Other';
                    return value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Employment Status */}
          <div className="chart-card">
            <h4>Employment Status</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={employmentData} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  type="category"
                  tickFormatter={(value) => value}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8">
                  {employmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={EMPLOYMENT_COLORS[index % EMPLOYMENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Age Ranges */}
          <div className="chart-card">
            <h4>Age Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageData} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  type="category"
                  tickFormatter={(value) => {
                    if (value === '18-25') return '18-25 years';
                    if (value === '26-32') return '26-32 years';
                    if (value === '33-40') return '33-40 years';
                    if (value === '41+') return '41+ years';
                    return value;
                  }}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#00C49F">
                  {ageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Signup Growth */}
          <div className="chart-card">
            <h4>Signup Growth</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.signupGrowth} margin={{ left: 10, right: 10, top: 5, bottom: 30 }}>
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
                  height={50}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ff7300" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;