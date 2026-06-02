import React from 'react';
import { FaSpinner } from 'react-icons/fa';
import '../styles/adminStatCards.css';

/** 3 cards → Customer Feedback style; 2 or 4 → Best Seller Analytics style */
export const statCardsVariantForCount = (count) => (count === 3 ? 'featured' : 'compact');

export const AdminStatCardsGrid = ({ variant = 'compact', count, className = '', children }) => {
  const resolvedVariant = variant || statCardsVariantForCount(count ?? React.Children.count(children));
  const colsClass =
    resolvedVariant === 'featured'
      ? 'admin-stat-cards--cols-3'
      : count === 2
        ? 'admin-stat-cards--cols-2'
        : count === 4
          ? 'admin-stat-cards--cols-4'
          : '';

  return (
    <div
      className={`admin-stat-cards admin-stat-cards--${resolvedVariant} ${colsClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
};

export const AdminStatCard = ({
  variant = 'compact',
  label,
  value,
  icon: Icon,
  iconColor = '#1976d2',
  iconBackground = '#f8f9fa',
  loading = false,
}) => {
  const isFeatured = variant === 'featured';
  const displayValue = loading ? (
    <FaSpinner className="admin-stat-card__spinner" aria-hidden />
  ) : (
    value
  );

  const iconEl = Icon ? (
    <Icon style={{ color: iconColor }} />
  ) : null;

  const accentStyle = { '--stat-accent-color': iconColor };

  if (isFeatured) {
    return (
      <div
        className="admin-stat-card admin-stat-card--featured"
        style={accentStyle}
      >
        <div
          className="admin-stat-card__icon--featured"
          style={{ background: iconBackground, color: iconColor }}
        >
          {iconEl}
        </div>
        <div className="admin-stat-card__body admin-stat-card__body--featured">
          <div className="admin-stat-card__label admin-stat-card__label--featured-top">{label}</div>
          <div className="admin-stat-card__value admin-stat-card__value--featured">{displayValue}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="admin-stat-card admin-stat-card--compact"
      style={accentStyle}
    >
      <div
        className="admin-stat-card__icon--compact"
        style={{ background: iconBackground, color: iconColor }}
      >
        {iconEl}
      </div>
      <div className="admin-stat-card__body admin-stat-card__body--compact">
        <div className="admin-stat-card__value">{displayValue}</div>
        <div className="admin-stat-card__label">{label}</div>
      </div>
    </div>
  );
};

/** Active / Inactive / Scheduled / Expired — promo & reward pages */
export const getPromoRewardStatusColors = (status) => {
  switch (status) {
    case 'Active':
      return { iconColor: '#2e7d32', iconBackground: '#e8f5e8' };
    case 'Inactive':
      return { iconColor: '#6c757d', iconBackground: '#f5f5f5' };
    case 'Scheduled':
      return { iconColor: '#f57c00', iconBackground: '#fff3e0' };
    case 'Expired':
      return { iconColor: '#d32f2f', iconBackground: '#ffebee' };
    default:
      return { iconColor: '#1976d2', iconBackground: '#f8f9fa' };
  }
};

export default AdminStatCardsGrid;
