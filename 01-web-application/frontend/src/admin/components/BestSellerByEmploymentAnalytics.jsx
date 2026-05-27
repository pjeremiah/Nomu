import React, { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';

const CATEGORIES = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];

const formatQty = (num) => new Intl.NumberFormat('en-US').format(num);

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
      <h5 style={{ margin: '0 0 8px 0', color: '#003466', fontSize: '1rem', fontWeight: 600 }}>
        Best Seller by Employment (Student vs Employee)
      </h5>
      <p className="admin-analytics-muted" style={{ margin: '0 0 16px 0', maxWidth: '720px' }}>
        Top <strong>10</strong> items per category by quantity sold — separate charts for <strong>Students</strong> and{' '}
        <strong>Employees</strong>.
      </p>

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
                      Total qty: <strong>{formatQty(totalQty)}</strong>
                    </span>
                    <span className="eb-summary-pill">
                      Orders: <strong>{formatQty(totalOrders)}</strong>
                    </span>
                  </div>
                  {CATEGORIES.map((category) => {
                    const raw = Array.isArray(categories[category]) ? categories[category] : [];
                    const chartRows = raw.map((item, i) => ({
                      ...item,
                      key: `${item.itemName || 'item'}-${i}`,
                      itemName: item.itemName || 'Unknown'
                    }));
                    const catQty = chartRows.reduce((s, item) => s + Number(item.totalQuantity || 0), 0);
                    const catOrders = chartRows.reduce((s, item) => s + Number(item.totalOrders || 0), 0);

                    return (
                      <div key={`${block.key}-${category}`} className="eb-category-block eb-category-block--chart">
                        <div className="eb-category-label">
                          <span className="eb-category-title">{category}</span>
                          {chartRows.length > 0 ? (
                            <span className="eb-category-meta">
                              Top {chartRows.length} · {formatQty(catQty)} qty · {formatQty(catOrders)} orders
                            </span>
                          ) : null}
                        </div>
                        {chartRows.length > 0 ? (
                          <div className="eb-chart-wrap">
                            <ResponsiveContainer width="100%" height={280}>
                              <BarChart
                                data={chartRows}
                                margin={{ top: 8, right: 12, left: 4, bottom: chartRows.length > 4 ? 88 : 56 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  dataKey="itemName"
                                  angle={-32}
                                  textAnchor="end"
                                  interval={0}
                                  height={chartRows.length > 4 ? 82 : 52}
                                  tick={{ fontSize: 10 }}
                                  tickLine={false}
                                  axisLine={{ stroke: '#dee2e6' }}
                                />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
                                <Tooltip
                                  formatter={(value, name) => {
                                    if (name === 'totalQuantity') return [formatQty(value), 'Quantity'];
                                    if (name === 'totalOrders') return [formatQty(value), 'Orders'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label) => `Item: ${label}`}
                                />
                                <Bar
                                  dataKey="totalQuantity"
                                  name="Quantity"
                                  fill={accent}
                                  radius={[4, 4, 0, 0]}
                                  maxBarSize={48}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
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
