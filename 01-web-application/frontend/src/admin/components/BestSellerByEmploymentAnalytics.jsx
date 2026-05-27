import React, { useCallback, useEffect, useState } from 'react';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '16px' }}>Loading Student vs Employee best sellers...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '16px', color: '#c62828' }}>
        <div>{error}</div>
        <button
          onClick={fetchData}
          style={{
            marginTop: 8,
            border: 'none',
            borderRadius: 6,
            background: '#003466',
            color: '#fff',
            padding: '8px 14px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

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

  return (
    <div style={{ marginTop: 16 }}>
      <h5 style={{ margin: '0 0 12px 0', color: '#003466' }}>
        Best Seller by Employment (Student vs Employee)
      </h5>
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
                      <div style={{ fontSize: 12, color: '#6c757d' }}>{category}</div>
                      {topItems.length > 0 ? (
                        <div style={{ marginTop: 4, display: 'grid', gap: 4 }}>
                          {topItems.map((item, idx) => (
                            <div key={`${block.key}-${category}-${item.itemName}-${idx}`} style={{ fontSize: 12 }}>
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
                        <div style={{ marginTop: 2, fontSize: 12, color: '#9aa0a6' }}>No data</div>
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
