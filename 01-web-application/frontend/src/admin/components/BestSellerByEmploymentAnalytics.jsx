import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

const formatEmploymentChartNumber = (num) => new Intl.NumberFormat('en-US').format(num);

const BestSellerByEmploymentAnalytics = ({ period = 'monthly' }) => {
  const [data, setData] = useState({
    employment: {
      Student: { Donuts: [], Drinks: [], Pastries: [], Pizzas: [] },
      Employed: { Donuts: [], Drinks: [], Pastries: [], Pizzas: [] }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const mapPeriod = (value) => {
    const periodMapping = {
      daily: 'today',
      weekly: 'week',
      monthly: 'month',
      yearly: 'year'
    };
    return periodMapping[value] || 'month';
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');

      const backendPeriod = mapPeriod(period);
      const res = await fetch(
        `${API_BASE}/api/analytics/best-sellers-by-employment-category?period=${backendPeriod}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        throw new Error(`API failed: ${res.status}`);
      }

      const payload = await res.json();
      setData({
        employment: payload?.employment || {
          Student: { Donuts: [], Drinks: [], Pastries: [], Pizzas: [] },
          Employed: { Donuts: [], Drinks: [], Pastries: [], Pizzas: [] }
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartData = useMemo(() => {
    const result = [];
    const employmentData = data?.employment || {};
    CATEGORIES.forEach((category) => {
      const studentItems = Array.isArray(employmentData.Student?.[category]) ? employmentData.Student[category] : [];
      const employedItems = Array.isArray(employmentData.Employed?.[category]) ? employmentData.Employed[category] : [];

      const studentQty = studentItems.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0);
      const employedQty = employedItems.reduce((sum, item) => sum + Number(item.totalQuantity || 0), 0);

      result.push({
        category,
        Student: studentQty,
        Employed: employedQty
      });
    });
    return result;
  }, [data]);

  const employmentBlocks = [
    {
      key: 'Student',
      title: 'Students',
      icon: <FaGraduationCap style={{ color: '#7b1fa2' }} />
    },
    {
      key: 'Employed',
      title: 'Employees',
      icon: <FaBriefcase style={{ color: '#1976d2' }} />
    }
  ];

  if (loading) {
    return (
      <div className="admin-analytics-loading" style={{ textAlign: 'center', padding: '16px' }}>
        Loading Student vs Employee best sellers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-analytics-error-msg" style={{ textAlign: 'center', padding: '16px', color: '#c62828' }}>
        <div>{error}</div>
        <button
          type="button"
          className="admin-analytics-btn"
          onClick={fetchData}
          style={{
            marginTop: 8,
            border: 'none',
            borderRadius: 6,
            background: '#003466',
            color: '#fff',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="best-seller-employment-section" style={{ marginTop: 16 }}>
      <h5 style={{ margin: '0 0 12px 0', color: '#003466', fontSize: '1rem', fontWeight: 600 }}>
        Best Seller by Employment (Student vs Employee)
      </h5>

      <div
        style={{
          borderRadius: 12,
          border: '1px solid #e9ecef',
          background: '#ffffff',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          padding: 16,
          marginBottom: 16
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div className="admin-analytics-muted">
            Visual comparison of <strong>total quantity sold</strong> by employment type for each product category.
          </div>
        </div>
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#dee2e6' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatEmploymentChartNumber(value)}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatEmploymentChartNumber(value),
                  name === 'Students' || name === 'Student' ? 'Students' : 'Employees'
                ]}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar
                dataKey="Student"
                name="Students"
                fill="#7b1fa2"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="Employed"
                name="Employees"
                fill="#1976d2"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 12
        }}
      >
        {employmentBlocks.map((block) => {
          const categories = data?.employment?.[block.key] || {};
          return (
            <div
              key={block.key}
              style={{
                border: '1px solid #e9ecef',
                borderRadius: 10,
                background: '#fff',
                padding: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                {block.icon}
                <strong style={{ color: '#212c59' }}>{block.title}</strong>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {CATEGORIES.map((category) => {
                  const topItems = Array.isArray(categories[category]) ? categories[category] : [];
                  return (
                    <div
                      key={`${block.key}-${category}`}
                      style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        padding: '8px 10px',
                        background: '#fafbff'
                      }}
                    >
                      <div className="admin-analytics-muted">{category}</div>
                      {topItems.length > 0 ? (
                        <div style={{ marginTop: 4, display: 'grid', gap: 4 }}>
                          {topItems.map((item, idx) => (
                            <div key={`${block.key}-${category}-${item.itemName}-${idx}`} style={{ fontSize: '14px' }}>
                              <div style={{ fontWeight: 600, color: '#1b2a59' }}>
                                {idx + 1}. {item.itemName}
                              </div>
                              <div style={{ color: '#495057' }}>
                                Qty: {Number(item.totalQuantity || 0).toLocaleString()} | Orders: {Number(item.totalOrders || 0).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="admin-analytics-muted" style={{ marginTop: 2 }}>No data</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BestSellerByEmploymentAnalytics;
