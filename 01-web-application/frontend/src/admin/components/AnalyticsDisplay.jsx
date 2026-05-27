import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { FaBriefcase, FaGraduationCap } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
applyPlugin(jsPDF);

const AnalyticsDisplay = forwardRef((props, ref) => {
  const [employmentSpendingData, setEmploymentSpendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch employment spending data
      const employmentRes = await fetch(`${API_BASE}/api/analytics/highest-spenders-by-employment`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      let employmentData = [];
      
      if (employmentRes.ok) {
        employmentData = await employmentRes.json();
        // Ensure fixed order: Employed first, then Student (API returns both with real/zero data)
        const employed = employmentData.find((d) => d.employmentStatus === 'Employed');
        const student = employmentData.find((d) => d.employmentStatus === 'Student');
        employmentData = [
          employed || { employmentStatus: 'Employed', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 },
          student || { employmentStatus: 'Student', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 }
        ];
      }

      setEmploymentSpendingData(employmentData);

    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(`Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Set up auto-refresh every 30 seconds for real-time updates
    const analyticsInterval = setInterval(() => {
      fetchAnalyticsData();
    }, 30000); // 30 seconds
    
    return () => clearInterval(analyticsInterval);
  }, [fetchAnalyticsData]);

  const handleExportPDF = useCallback(() => {
    const employedRow = employmentSpendingData.find((d) => d.employmentStatus === 'Employed') || { employmentStatus: 'Employed', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 };
    const studentRow = employmentSpendingData.find((d) => d.employmentStatus === 'Student') || { employmentStatus: 'Student', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 };
    const displayData = [employedRow, studentRow];

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Business Analytics Report', pageW / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, y);
    y += 14;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Spending Analysis: Employed vs Students', 14, y);
    y += 8;

    doc.autoTable({
      startY: y,
      head: [['Employment Status', 'Total Spent (₱)', 'Users', 'Orders', 'Avg (₱)']],
      body: displayData.map((row) => [
        row.employmentStatus,
        row.totalSpent.toLocaleString(),
        String(row.userCount || 0),
        String(row.totalOrders || 0),
        Number(row.averageSpent || 0).toFixed(0)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [0, 52, 102], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 }
    });
    y = doc.lastAutoTable.finalY + 12;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('Nomu Cafe – Business Analytics', 14, doc.internal.pageSize.getHeight() - 10);

    doc.save(`business-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [employmentSpendingData]);

  useImperativeHandle(ref, () => ({ exportPDF: handleExportPDF }), [handleExportPDF]);

  if (loading) {
    return (
      <div className="analytics-display admin-analytics-loading" style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading average spent analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-display admin-analytics-error-msg" style={{ textAlign: 'center', padding: '40px', color: '#c62828' }}>
        <div>{error}</div>
        <button 
          type="button"
          className="admin-analytics-btn"
          onClick={fetchAnalyticsData}
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            background: '#003466', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Always show both Employed and Student (API returns real data; missing = 0)
  const employedRow = employmentSpendingData.find((d) => d.employmentStatus === 'Employed') || { employmentStatus: 'Employed', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 };
  const studentRow = employmentSpendingData.find((d) => d.employmentStatus === 'Student') || { employmentStatus: 'Student', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 };
  const displayData = [employedRow, studentRow];

  return (
    <div className="analytics-display">
      {/* Spending Analysis: both Employed and Student always visible, real data from API */}
      <div style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '2rem'
      }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#003466' }}>Spending Analysis: Employed vs Students</h4>
          
          {/* Summary Comparison - both Employed and Student always shown; comparison avoids division by zero */}
          {(
            <div style={{
              background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
              padding: '1rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              border: '1px solid #e1bee7'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h5 style={{ margin: 0, color: '#003466' }}>Total Spending Comparison</h5>
                <div className="admin-analytics-muted" style={{ fontWeight: 500 }}>
                  {(() => {
                    const a = displayData[0];
                    const b = displayData[1];
                    if (a.totalSpent === 0 && b.totalSpent === 0) {
                      return <span>No spending in this period yet.</span>;
                    }
                    if (a.totalSpent === 0) {
                      return <span style={{ color: '#7b1fa2', fontWeight: '600' }}>Only {b.employmentStatus} have spending so far (₱{b.totalSpent.toLocaleString()}).</span>;
                    }
                    if (b.totalSpent === 0) {
                      return <span style={{ color: '#1976d2', fontWeight: '600' }}>Only {a.employmentStatus} have spending so far (₱{a.totalSpent.toLocaleString()}).</span>;
                    }
                    if (a.totalSpent > b.totalSpent) {
                      return <span style={{ color: '#1976d2', fontWeight: '600' }}>{a.employmentStatus} spend {(((a.totalSpent - b.totalSpent) / b.totalSpent) * 100).toFixed(0)}% more</span>;
                    }
                    return <span style={{ color: '#7b1fa2', fontWeight: '600' }}>{b.employmentStatus} spend {(((b.totalSpent - a.totalSpent) / a.totalSpent) * 100).toFixed(0)}% more</span>;
                  })()}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {displayData.map((category, index) => (
                  <div key={index} style={{
                    background: '#fff',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {category.employmentStatus === 'Employed' ? (
                        <FaBriefcase style={{ color: '#1976d2' }} />
                      ) : (
                        <FaGraduationCap style={{ color: '#7b1fa2' }} />
                      )}
                      <span style={{ fontWeight: '600', color: '#003466' }}>{category.employmentStatus}</span>
                    </div>
                    <div className="admin-analytics-kpi-sm">
                      ₱{category.totalSpent.toLocaleString()}
                    </div>
                    <div className="admin-analytics-muted" style={{ marginTop: '4px' }}>
                      {category.userCount} users • {category.totalOrders} orders • Avg: ₱{Number(category.averageSpent || 0).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Total Spending by Employment Status - both cards always visible */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {displayData.map((category, index) => (
              <div key={index} style={{
                background: '#fff',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                textAlign: 'center',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  {category.employmentStatus === 'Employed' ? (
                    <FaBriefcase style={{ color: '#1976d2', fontSize: '1.25rem' }} />
                  ) : (
                    <FaGraduationCap style={{ color: '#7b1fa2', fontSize: '1.25rem' }} />
                  )}
                  <h5 style={{ margin: 0, color: '#003466' }}>{category.employmentStatus}</h5>
                </div>
                
                <div className="admin-analytics-kpi">
                  ₱{category.totalSpent.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>


      <style jsx>{`
        .analytics-display {
          padding: 1rem;
        }
        
        @media (max-width: 768px) {
          .analytics-display {
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
});

AnalyticsDisplay.displayName = 'AnalyticsDisplay';
export default AnalyticsDisplay;
