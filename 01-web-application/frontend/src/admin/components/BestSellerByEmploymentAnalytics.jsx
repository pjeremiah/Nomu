import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

const formatEmploymentChartNumber = (num) => new Intl.NumberFormat('en-US').format(num);

function aggregateEmploymentColumn(catMap) {
  let totalQty = 0;
  let totalOrders = 0;
  CATEGORIES.forEach((c) => {
    const items = Array.isArray(catMap?.[c]) ? catMap[c] : [];
    items.forEach((item) => {
      totalQty += Number(item.totalQuantity || 0);
      totalOrders += Number(item.totalOrders || 0);
    });
  });
  return { totalQty, totalOrders };
}

function rankBadgeClass(index) {
  if (index === 0) return 'eb-rank eb-rank--1';
  if (index === 1) return 'eb-rank eb-rank--2';
  if (index === 2) return 'eb-rank eb-rank--3';
  return 'eb-rank eb-rank--n';
}

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
      <p className="admin-analytics-muted" style={{ margin: '0 0 16px 0', maxWidth: '720px' }}>
        Top items per category for each group. Bars below compare items <strong>within the same category</strong> (longer = more quantity sold for that group).
      </p>

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

      <div className="eb-detail-grid">
        {employmentBlocks.map((block) => {
          const categories = data?.employment?.[block.key] || {};
          const { totalQty, totalOrders } = aggregateEmploymentColumn(categories);
          const accent = block.key === 'Student' ? '#7b1fa2' : '#1976d2';
          const colClass =
            block.key === 'Student' ? 'eb-detail-column eb-detail-column--student' : 'eb-detail-column eb-detail-column--employed';

          return (
            <div key={block.key} className={colClass}>
              <div className="eb-detail-column-head">
                {block.icon}
                <strong>{block.title}</strong>
              </div>

              {totalQty === 0 ? (
                <div className="eb-column-empty">
                  {block.key === 'Student'
                    ? 'No student purchases in this period for these categories.'
                    : 'No employee purchases in this period for these categories.'}
                </div>
              ) : (
                <>
                  <div className="eb-summary-strip">
                    <span className="eb-summary-pill">
                      Total qty: <strong>{formatEmploymentChartNumber(totalQty)}</strong>
                    </span>
                    <span className="eb-summary-pill">
                      Orders: <strong>{formatEmploymentChartNumber(totalOrders)}</strong>
                    </span>
                  </div>
                  {CATEGORIES.map((category) => {
                    const topItems = Array.isArray(categories[category]) ? categories[category] : [];
                    const catQty = topItems.reduce((s, item) => s + Number(item.totalQuantity || 0), 0);
                    const catOrders = topItems.reduce((s, item) => s + Number(item.totalOrders || 0), 0);
                    const maxItemQty = Math.max(...topItems.map((i) => Number(i.totalQuantity || 0)), 1);

                    return (
                      <div key={`${block.key}-${category}`} className="eb-category-block">
                        <div className="eb-category-label">
                          <span className="eb-category-title">{category}</span>
                          {topItems.length > 0 ? (
                            <span className="eb-category-meta">
                              {topItems.length} item{topItems.length !== 1 ? 's' : ''} · {formatEmploymentChartNumber(catQty)} qty ·{' '}
                              {formatEmploymentChartNumber(catOrders)} orders
                            </span>
                          ) : null}
                        </div>
                        {topItems.length > 0 ? (
                          topItems.map((item, idx) => {
                            const qty = Number(item.totalQuantity || 0);
                            const ord = Number(item.totalOrders || 0);
                            const pct = maxItemQty > 0 ? Math.round((qty / maxItemQty) * 100) : 0;
                            return (
                              <div key={`${block.key}-${category}-${item.itemName}-${idx}`} className="eb-item-row">
                                <div className={rankBadgeClass(idx)}>{idx + 1}</div>
                                <div>
                                  <div className="eb-item-name">{item.itemName}</div>
                                  <div className="eb-item-stats">
                                    <span>
                                      Qty: <strong>{formatEmploymentChartNumber(qty)}</strong>
                                    </span>
                                    <span>
                                      Orders: <strong>{formatEmploymentChartNumber(ord)}</strong>
                                    </span>
                                  </div>
                                  <div className="eb-qty-bar-track" aria-hidden>
                                    <div
                                      className="eb-qty-bar-fill"
                                      style={{ width: `${pct}%`, background: accent }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="eb-empty-category">No sales in this category for {block.title.toLowerCase()}.</div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BestSellerByEmploymentAnalytics;
