import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FaChartBar, FaCoffee, FaTrophy, FaFileDownload } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

/** Y-axis for quantity charts: ticks 0, 3, 6, … with domain ending on a multiple of `step`. */
function quantityAxisFromMax(maxQty, step = 3) {
  const max = Math.max(0, Number(maxQty) || 0);
  const yMax = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let v = 0; v <= yMax; v += step) {
    ticks.push(v);
  }
  return { domain: [0, yMax], ticks };
}

const BestSellerAnalytics = forwardRef(({ period = 'monthly' }, ref) => {
  const [analyticsData, setAnalyticsData] = useState({
    bestSellers: [],
    bestSellersByCategory: { categories: {}, categoryTotals: {} }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getPeriodDateRange = (p) => {
    const now = new Date();
    let startDate, endDate;
    if (p === 'daily' || p === 'today') {
      startDate = endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (p === 'weekly' || p === 'week') {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSunday);
    } else if (p === 'monthly' || p === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (p === 'yearly' || p === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    } else {
      return null;
    }
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return startDate.getTime() === endDate.getTime() ? fmt(startDate) : `${fmt(startDate)} – ${fmt(endDate)}`;
  };

  const handleExportPDF = () => {
    const rows = analyticsData.bestSellers || [];
    const totalQty = rows.reduce((sum, item) => sum + (item.totalQuantity || 0), 0);
    const top3Share = rows.length >= 3
      ? rows.slice(0, 3).reduce((sum, item) => sum + parseFloat(item.quantityPercentage || 0), 0).toFixed(1)
      : null;
    const bestSellerName = rows.length > 0 ? rows[0].itemName : null;
    const periodLabel = getPeriodDateRange(period) || period;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Best Seller Analytics Report', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Period: ${period}`, 14, y);
    doc.text(`Date range: ${periodLabel}`, 14, y + 6);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y + 12);
    y += 22;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary', 14, y);
    y += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Top Items: ${rows.length}`, 14, y);
    doc.text(`Total Quantity: ${formatNumber(totalQty)}`, 14, y + 6);
    y += 16;

    if (bestSellerName || top3Share != null) {
      doc.setFont(undefined, 'bold');
      doc.text('Insights', 14, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      if (bestSellerName) {
        doc.text(`#1 this period: ${bestSellerName}`, 14, y);
        y += 6;
      }
      if (top3Share != null) {
        doc.text(`Top 3 items account for ${top3Share}% of quantity sold.`, 14, y);
        y += 8;
      }
      y += 4;
    }

    const addNewPageIfNeeded = (requiredSpace = 40) => {
      if (y > doc.internal.pageSize.getHeight() - requiredSpace) {
        doc.addPage();
        y = 18;
      }
    };

    doc.setFont(undefined, 'bold');
    doc.text('1. Top Selling Items', 14, y);
    y += 6;
    doc.autoTable({
      startY: y,
      head: [['Item Name', 'Quantity']],
      body: rows.map((item) => [
        String(item.itemName || ''),
        String(formatNumber(item.totalQuantity || 0))
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 52, 102], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 }
    });
    y = doc.lastAutoTable.finalY + 14;
    addNewPageIfNeeded(60);

    const categories = analyticsData.bestSellersByCategory?.categories || {};
    if (Object.keys(categories).length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('2. By Category', 14, y);
      y += 6;
      Object.entries(categories).forEach(([category, items]) => {
        addNewPageIfNeeded(40);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(category, 14, y);
        y += 6;
        doc.autoTable({
          startY: y,
          head: [['Item Name', 'Quantity']],
          body: (items || []).map((item) => [
            String(item.itemName || ''),
            String(formatNumber(item.totalQuantity || 0))
          ]),
          theme: 'grid',
          headStyles: { fillColor: [0, 52, 102], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: 14 }
        });
        y = doc.lastAutoTable.finalY + 10;
      });
      y += 4;
      addNewPageIfNeeded(50);
    }

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('3. Detailed Performance', 14, y);
    y += 6;

    doc.autoTable({
      startY: y,
      head: [['Rank', 'Item Name', 'Quantity', 'Customers', 'Share %']],
      body: rows.map((item, i) => [
        String(i + 1),
        String(item.itemName || ''),
        String(formatNumber(item.totalQuantity || 0)),
        String(formatNumber(item.uniqueCustomers || 0)),
        `${item.quantityPercentage || 0}%`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 52, 102], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 22 }
      },
      margin: { left: 14 }
    });

    y = doc.lastAutoTable.finalY + 12;
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Nomu Cafe – Best Seller Analytics', 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`best-sellers-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  useImperativeHandle(ref, () => ({ exportPDF: handleExportPDF }), [handleExportPDF]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      
      // Test authentication first
      try {
        const testRes = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!testRes.ok) {
          const errorData = await testRes.json();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          throw new Error(`Authentication failed: ${testRes.status} - ${errorData.message || 'Unknown error'}`);
        }
        
        const userData = await testRes.json();
        
        if (!['superadmin', 'manager', 'staff'].includes(userData.role)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          throw new Error('Access denied: Admin role required');
        }
      } catch (error) {
        throw error;
      }
      
      // Map frontend period values to backend expected values
      const periodMapping = {
        'daily': 'today',
        'weekly': 'week', 
        'monthly': 'month',
        'yearly': 'year'
      };
      
      const backendPeriod = periodMapping[period] || 'month';
      
      // Fetch all analytics data in parallel
      const [bestSellersRes, categoryRes] = await Promise.all([
        fetch(`${API_BASE}/api/analytics/best-sellers?period=${backendPeriod}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/analytics/best-sellers-by-category?period=${backendPeriod}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Check responses
      if (!bestSellersRes.ok) {
        const errorText = await bestSellersRes.text();
        console.error(`Best Sellers API failed: ${bestSellersRes.status}`, errorText);
        throw new Error(`Best Sellers API failed: ${bestSellersRes.status} - ${errorText}`);
      }
      if (!categoryRes.ok) {
        const errorText = await categoryRes.text();
        console.error(`Category API failed: ${categoryRes.status}`, errorText);
        throw new Error(`Category API failed: ${categoryRes.status} - ${errorText}`);
      }

      const [bestSellersData, categoryData] = await Promise.all([
        bestSellersRes.json(),
        categoryRes.json()
      ]);

      // Check if we have data for the selected period
      const hasData = bestSellersData.bestSellers && bestSellersData.bestSellers.length > 0;
      
      if (!hasData && (period === 'daily' || period === 'weekly' || period === 'monthly' || period === 'yearly')) {
        let noDataMessage = '';
        if (period === 'daily' || period === 'weekly') {
          noDataMessage = `No sales data available for ${period} period. This might be because there were no orders during this time. Try selecting Monthly or Yearly for more comprehensive data.`;
        } else if (period === 'monthly') {
          noDataMessage = `No sales data available for monthly period. This might be because there were no orders during this time. Try selecting Yearly for more comprehensive data.`;
        } else if (period === 'yearly') {
          noDataMessage = `No sales data available for yearly period. This might be because there were no orders during this year.`;
        }
        
        setAnalyticsData({
          bestSellers: [],
          bestSellersByCategory: { categories: {}, categoryTotals: {} },
          noDataMessage: noDataMessage
        });
      } else {
        setAnalyticsData({
          bestSellers: bestSellersData.bestSellers || [],
          bestSellersByCategory: categoryData || { categories: {}, categoryTotals: {} },
          noDataMessage: null
        });
      }
    } catch (err) {
      console.error('Error fetching best seller analytics:', err);
      
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
  }, [period]);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up auto-refresh every 5 minutes
    const analyticsInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 300000); // 5 minutes
    
    return () => clearInterval(analyticsInterval);
  }, [period, fetchAnalyticsData]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="bestseller-analytics-container admin-analytics-loading" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <div className="spinner" style={{ 
            width: '20px', 
            height: '20px', 
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #003466',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading best seller analytics...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bestseller-analytics-container admin-analytics-error-msg" style={{ textAlign: 'center', padding: '40px', color: '#d32f2f' }}>
        <div style={{ marginBottom: '15px', fontSize: '14px' }}>{error}</div>
        <button 
          type="button"
          className="admin-analytics-btn"
          onClick={fetchAnalyticsData}
          style={{ 
            padding: '10px 20px', 
            background: '#003466', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const periodLabel = getPeriodDateRange(period);
  const top3Share = analyticsData.bestSellers.length >= 3
    ? analyticsData.bestSellers.slice(0, 3).reduce((sum, item) => sum + parseFloat(item.quantityPercentage || 0), 0).toFixed(1)
    : null;
  const bestSellerName = analyticsData.bestSellers.length > 0 ? analyticsData.bestSellers[0].itemName : null;

  const topSellingQtyMax = analyticsData.bestSellers.length > 0
    ? Math.max(...analyticsData.bestSellers.map((item) => Number(item.totalQuantity) || 0))
    : 0;
  const topSellingAxis = quantityAxisFromMax(topSellingQtyMax, 3);

  const categoryBuckets = analyticsData.bestSellersByCategory?.categories || {};
  const categoryDisplayOrder = ['Donuts', 'Pizzas', 'Drinks', 'Pastries'];
  let byCategoryGlobalMax = 0;
  categoryDisplayOrder.forEach((cat) => {
    const arr = categoryBuckets[cat];
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      byCategoryGlobalMax = Math.max(byCategoryGlobalMax, Number(item.totalQuantity) || 0);
    });
  });
  const byCategoryAxis = quantityAxisFromMax(byCategoryGlobalMax, 3);

  return (
    <div className="bestseller-analytics-container">
      {/* No Data Message */}
      {analyticsData.noDataMessage && (
        <div style={{
          background: '#fff3e0',
          border: '1px solid #ffb74d',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#e65100'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            📊 No Data Available
          </div>
          <div style={{ fontSize: '14px' }}>
            {analyticsData.noDataMessage}
          </div>
        </div>
      )}

      {/* Period date range + Export PDF (same row, right-aligned) */}
      {periodLabel && (
        <div className="period-date-range admin-analytics-muted" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span>Reporting period: <strong>{periodLabel}</strong></span>
          <button
            type="button"
            className="admin-analytics-btn"
            onClick={handleExportPDF}
            title="Export report as PDF (Top Selling Items, By Category, Detailed Performance)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#003466',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <FaFileDownload /> Export PDF
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {analyticsData.bestSellers.length > 0 && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">
              <FaCoffee style={{ color: '#1976d2' }} />
            </div>
            <div className="summary-content">
              <div className="summary-value">{analyticsData.bestSellers.length}</div>
              <div className="summary-label">Top Items</div>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <FaChartBar style={{ color: '#2e7d32' }} />
            </div>
            <div className="summary-content">
              <div className="summary-value">{formatNumber(analyticsData.bestSellers.reduce((sum, item) => sum + item.totalQuantity, 0))}</div>
              <div className="summary-label">Total Quantity</div>
            </div>
          </div>
        </div>
      )}

      {/* Insights card */}
      {analyticsData.bestSellers.length > 0 && (top3Share || bestSellerName) && (
        <div className="insights-card">
          <div className="insights-card-header">
            <FaTrophy style={{ color: '#f9a825', marginRight: '8px', fontSize: '1.1rem' }} />
            <span>Insights</span>
          </div>
          <ul className="insights-list">
            {bestSellerName && (
              <li>#1 this period: <strong>{bestSellerName}</strong></li>
            )}
            {top3Share != null && (
              <li>Your top 3 items account for <strong>{top3Share}%</strong> of quantity sold.</li>
            )}
          </ul>
        </div>
      )}

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Best Sellers Bar Chart */}
        {analyticsData.bestSellers.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Top Selling Items</h4>
            </div>
            <ResponsiveContainer width="100%" height={600}>
              <BarChart data={analyticsData.bestSellers} margin={{ top: 10, right: 10, left: 10, bottom: 150 }}>
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
                  domain={topSellingAxis.domain}
                  ticks={topSellingAxis.ticks}
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    formatNumber(value), 
                    name === 'totalQuantity' ? 'Quantity' : 
                    name === 'totalOrders' ? 'Orders' : name
                  ]}
                  labelFormatter={(label) => `Item: ${label}`}
                />
                <Bar dataKey="totalQuantity" fill="#1976d2" name="Quantity" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Items Table */}
        {analyticsData.bestSellers.length > 0 && (
          <div className="chart-card">
            <div className="chart-header">
              <h4>Detailed Performance</h4>
            </div>
            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Customers</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.bestSellers.map((item, index) => (
                    <tr key={item.itemName} className={index === 0 ? 'best-seller-row' : ''}>
                      <td className="rank-cell">
                        <div className={`rank-badge rank-${index + 1}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="item-name">{item.itemName}</td>
                      <td className="number-cell">{formatNumber(item.totalQuantity)}</td>
                      <td className="number-cell">{formatNumber(item.uniqueCustomers)}</td>
                      <td className="percentage-cell">{item.quantityPercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Best Sellers by Category */}
        {Object.keys(analyticsData.bestSellersByCategory.categories).length > 0 && (
          <div className="chart-card full-width">
            <div className="chart-header">
              <h4>By Category</h4>
            </div>
            <div className="category-grid">
              {['Donuts', 'Pizzas', 'Drinks', 'Pastries']
                .filter((category) => analyticsData.bestSellersByCategory.categories?.[category])
                .map((category) => {
                  const items = analyticsData.bestSellersByCategory.categories?.[category] || [];
                  return (
                    <div key={category} className="category-section">
                      <h5 style={{ color: '#003466', marginBottom: '10px' }}>{category}</h5>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={items} margin={{ top: 10, right: 10, left: 10, bottom: 70 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="itemName" 
                            angle={-35}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            domain={byCategoryAxis.domain}
                            ticks={byCategoryAxis.ticks}
                            allowDecimals={false}
                          />
                          <Tooltip 
                            formatter={(value) => [formatNumber(value), 'Quantity']}
                          />
                          <Bar dataKey="totalQuantity" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <style jsx="true">{`
        .bestseller-analytics-container {
          padding: 0;
          width: 100%;
        }
        
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
          margin-top: 20px;
        }
        
        .summary-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          border: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .summary-icon {
          font-size: 24px;
          padding: 12px;
          border-radius: 8px;
          background: #f8f9fa;
        }
        
        .summary-content {
          flex: 1;
        }
        
        .summary-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #003466;
          line-height: 1;
        }
        
        .summary-label {
          font-size: 14px;
          color: #6c757d;
          margin-top: 4px;
        }
        
        .insights-card {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border: 1px solid #90caf9;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }
        
        .insights-card-header {
          display: flex;
          align-items: center;
          font-weight: 600;
          color: #1565c0;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .insights-list {
          margin: 0;
          padding-left: 20px;
          color: #37474f;
          font-size: 14px;
          line-height: 1.6;
        }
        
        .insights-list li {
          margin-bottom: 4px;
        }
        
        .chart-header-with-export {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          text-align: left;
        }
        
        .chart-header-with-export h4 {
          margin: 0;
        }
        
        .export-csv-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: #003466;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .export-csv-btn:hover {
          background: #002244;
        }
        
        .best-seller-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #f9a825;
          background: rgba(249, 168, 37, 0.15);
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }
        
        .best-seller-row {
          background: rgba(249, 168, 37, 0.06);
        }
        
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          padding: 0;
          width: 100%;
        }
        
        .chart-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid #e9ecef;
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .chart-card.full-width {
          grid-column: 1 / -1;
        }
        
        .chart-header {
          margin-bottom: 20px;
          text-align: center;
        }
        
        .chart-header h4 {
          margin: 0 0 5px 0;
          color: #003466;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .chart-subtitle {
          color: #6c757d;
          font-size: 14px;
        }
        
        .category-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
        }
        
        .category-section h5 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .performance-table {
          overflow-x: auto;
        }
        
        .performance-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        
        .performance-table th {
          background: #f8f9fa;
          color: #495057;
          font-weight: 600;
          padding: 12px 8px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
        }
        
        .performance-table th:nth-child(3),
        .performance-table th:nth-child(4) {
          text-align: center;
        }
        
        .performance-table th:nth-child(5) {
          text-align: right;
        }
        
        .performance-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #dee2e6;
        }
        
        .performance-table td:nth-child(3),
        .performance-table td:nth-child(4) {
          text-align: center;
        }
        
        .rank-cell {
          width: 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        
        .rank-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          font-weight: 700;
          font-size: 12px;
          color: white;
        }
        
        .rank-1 { background: #FFD700; }
        .rank-2 { background: #C0C0C0; }
        .rank-3 { background: #CD7F32; }
        .rank-4, .rank-5, .rank-6, .rank-7, .rank-8, .rank-9, .rank-10 { 
          background: #6c757d; 
        }
        
        .item-name {
          font-weight: 500;
          color: #003466;
        }
        
        .number-cell, .percentage-cell {
          font-family: inherit;
          font-variant-numeric: tabular-nums;
        }
        
        .percentage-cell {
          text-align: right;
          color: #1976d2;
          font-weight: 500;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive Design */
        @media (max-width: 1200px) {
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .chart-card.full-width {
            grid-column: auto;
          }

          .category-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 768px) {
          .bestseller-analytics-container {
            padding: 10px;
          }
          
          .charts-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          
          .chart-card {
            padding: 15px;
          }
          
          .summary-cards {
            grid-template-columns: 1fr;
            gap: 15px;
          }
        }
        
        @media (max-width: 600px) {
          .performance-table {
            font-size: 12px;
          }
          
          .performance-table th,
          .performance-table td {
            padding: 8px 4px;
          }
        }
      `}</style>
    </div>
  );
});
BestSellerAnalytics.displayName = 'BestSellerAnalytics';

export default BestSellerAnalytics;
