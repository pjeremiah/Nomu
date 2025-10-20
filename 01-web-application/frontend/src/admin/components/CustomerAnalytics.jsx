import React, { useState, useEffect, useCallback } from 'react';
import {
  Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const CustomerAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    gender: [],
    employment: [],
    ageRanges: [],
    overview: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

   
   // Specific colors for employment and age charts
   const EMPLOYMENT_COLORS = ['#4CAF50', '#2196F3', '#FF9800'];
   const AGE_COLORS = ['#9C27B0', '#00BCD4', '#4CAF50', '#FF9800', '#F44336'];

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const API_BASE = process.env.REACT_APP_API_URL || 'https://nomu-backend.onrender.com';
      
      // First, test if the backend is accessible
      try {
        const testRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!testRes.ok) {
          const errorData = await testRes.json();
          // Clear old authentication data if authentication fails
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          throw new Error(`Authentication failed: ${testRes.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        const userData = await testRes.json();
        
        if (!['superadmin', 'manager', 'staff'].includes(userData.role)) {
          // Clear old authentication data if role is invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          throw new Error('Access denied: Admin role required');
        }
      } catch (error) {
        throw error;
        }
        
        // Use monthly period for comprehensive customer analytics
        const backendPeriod = 'month';

        const [genderRes, employmentRes, ageRes, overviewRes] = await Promise.all([
          fetch(`${API_BASE}/api/analytics/gender?period=${backendPeriod}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/analytics/employment?period=${backendPeriod}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/analytics/age-ranges?period=${backendPeriod}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE}/api/analytics/overview?period=${backendPeriod}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
      ]);

      // Check if any responses failed
      if (!genderRes.ok) throw new Error(`Gender API failed: ${genderRes.status}`);
      if (!employmentRes.ok) throw new Error(`Employment API failed: ${employmentRes.status}`);
      if (!ageRes.ok) throw new Error(`Age API failed: ${ageRes.status}`);
      if (!overviewRes.ok) throw new Error(`Overview API failed: ${overviewRes.status}`);

      const [genderData, employmentData, ageData, overviewData] = await Promise.all([
        genderRes.json(),
        employmentRes.json(),
        ageRes.json(),
        overviewRes.json()
      ]);

      setAnalyticsData({
        gender: Array.isArray(genderData) ? genderData : [],
        employment: Array.isArray(employmentData) ? employmentData : [],
        ageRanges: Array.isArray(ageData) ? ageData : [],
        overview: overviewData || {}
      });
    } catch (err) {

      
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
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up auto-refresh for analytics data every 5 minutes
    const analyticsInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 300000); // 5 minutes - analytics data changes slowly
    
    return () => clearInterval(analyticsInterval);
  }, [fetchAnalyticsData]);

  // Helper function to ensure all categories are displayed
  const ensureAllCategories = (data, defaultCategories) => {
    const result = [...defaultCategories];
    
    if (Array.isArray(data)) {
      data.forEach(item => {
        const existingIndex = result.findIndex(cat => cat._id === item._id);
        if (existingIndex !== -1) {
          result[existingIndex].count = item.count;
        }
      });
    }
    
    return result;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading analytics...</div>
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

     // Prepare chart data with all categories
   const genderData = ensureAllCategories(analyticsData.gender, [
     { _id: 'Male', count: 0 },
     { _id: 'Female', count: 0 }
   ]).sort((a, b) => {
     // Ensure Male comes first (index 0 - blue), then Female (index 1 - pink)
     if (a._id === 'Male') return -1;
     if (b._id === 'Male') return 1;
     return 0;
   });

     const employmentData = ensureAllCategories(analyticsData.employment, [
     { _id: 'Student', count: 0 },
     { _id: 'Employed', count: 0 }
   ]).sort((a, b) => {
     // Ensure consistent order: Employed, Student
     const order = { 'Employed': 1, 'Student': 2 };
     return order[a._id] - order[b._id];
   });

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
                   if (value === '1-17') return '1-17 years';
                   if (value === '18-25') return '25 years';
                   if (value === '26-32') return '32 years';
                   if (value === '33-40') return '40 years';
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
        </div>
      </div>

      <style jsx="true" global>{`
        .analytics-container {
          padding: 15px;
        }
        
        .analytics-title {
          color: #003466;
          margin-bottom: 15px;
          font-size: 24px;
        }
        
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .overview-card {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .overview-card h4 {
          margin: 0 0 10px 0;
          color: #666;
        }
        
        .overview-number {
          font-size: 24px;
          font-weight: bold;
          color: #003466;
        }
        
        .analytics-container .charts-grid {
          display: grid !important;
          grid-template-columns: repeat(2, 1fr) !important;
          gap: 15px !important;
          width: 100% !important;
          max-width: 1000px !important;
          margin: 0 auto !important;
          padding: 0 15px !important;
        }
        
        .chart-card {
          background: #fff;
          padding: 15px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          min-height: 320px;
          width: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .chart-card h4 {
          margin: 0 0 15px 0;
          color: #003466;
          text-align: center;
          font-size: 16px;
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .chart-header h4 {
          margin: 0;
          color: #003466;
        }
        
        .period-select {
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .analytics-container .charts-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
            max-width: 600px !important;
          }
        }
        
        @media (max-width: 768px) {
          .analytics-container {
            padding: 15px;
          }
          
          .analytics-title {
            font-size: 20px;
            margin-bottom: 15px;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 15px;
            min-width: 100%;
          }
          
          .chart-card {
            min-height: 350px;
          }
          
          .overview-grid {
            gap: 15px;
          }
        }
        
        @media (max-width: 600px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }
          
          .analytics-container {
            padding: 10px;
          }
          
          .charts-grid {
            min-width: 100%;
          }
        }
        
        @media (max-width: 480px) {
          .chart-card {
            padding: 15px;
            min-height: 380px;
          }
          
          .chart-header {
            flex-direction: column;
            gap: 10px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerAnalytics;
