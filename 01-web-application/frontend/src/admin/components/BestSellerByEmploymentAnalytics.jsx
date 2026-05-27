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

/** Distinct from main Best Seller blue (#1976d2) and category purple (#8884d8). */
const STUDENT_BAR_COLOR = '#0d9488';
const EMPLOYED_BAR_COLOR = '#c2410c';

const formatQty = (num) => new Intl.NumberFormat('en-US').format(num);

/** Same rule as BestSellerAnalytics: Y ticks 0, 3, 6, … */
function quantityAxisFromMax(maxQty, step = 3) {
  const max = Math.max(0, Number(maxQty) || 0);
  const yMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(v);
  }
  return { domain: [0, yMax], ticks };
}

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

function maxQuantityInColumn(catMap) {
  let m = 0;
  CATEGORIES.forEach((c) => {
    const items = Array.isArray(catMap?.[c]) ? catMap[c] : [];
    items.forEach((item) => {
      m = Math.max(m, Number(item.totalQuantity) || 0);
    });
  });
  return m;
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
      barColor: STUDENT_BAR_COLOR,
      icon: <FaGraduationCap style={{ color: STUDENT_BAR_COLOR }} />
    },
    {
      key: 'Employed',
      title: 'Employees',
      barColor: EMPLOYED_BAR_COLOR,
      icon: <FaBriefcase style={{ color: EMPLOYED_BAR_COLOR }} />
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
      <h5 style={{ margin: '0 0 16px 0', color: '#003466', fontSize: '1rem', fontWeight: 600 }}>
        Best Seller by Employment (Student vs Employee)
      </h5>

      <div className="eb-detail-grid">
        {employmentBlocks.map((block) => {
          const categories = data?.employment?.[block.key] || {};
          const { totalQty, totalOrders } = aggregateEmploymentColumn(categories);
          const columnQtyMax = maxQuantityInColumn(categories);
          const yAxis = quantityAxisFromMax(columnQtyMax, 3);
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

                    return (
                      <div key={`${block.key}-${category}`} className="eb-category-block eb-category-block--chart">
                        <div className="eb-category-chart-header">
                          <h5 style={{ color: '#003466', margin: '0 0 10px 0', fontSize: '1rem', fontWeight: 600 }}>
                            {category}
                          </h5>
                        </div>
                        {chartRows.length > 0 ? (
                          <div className="eb-chart-wrap">
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart
                                data={chartRows}
                                margin={{ top: 10, right: 10, left: 10, bottom: 120 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="itemName"
                                  angle={-45}
                                  textAnchor="end"
                                  height={120}
                                  tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                  tick={{ fontSize: 12 }}
                                  domain={yAxis.domain}
                                  ticks={yAxis.ticks}
                                  allowDecimals={false}
                                />
                                <Tooltip
                                  formatter={(value, name) => {
                                    if (name === 'totalQuantity') return [formatQty(value), 'Quantity'];
                                    if (name === 'totalOrders') return [formatQty(value), 'Orders'];
                                    return [value, name];
                                  }}
                                  labelFormatter={(label) => `Item: ${label}`}
                                />
                                <Bar dataKey="totalQuantity" name="Quantity" fill={block.barColor} />
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
