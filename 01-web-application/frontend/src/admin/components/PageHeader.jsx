import React from 'react';
import { BarChart3, Users, Coffee, Gift, Star, MessageSquare } from 'lucide-react';

const PageHeader = ({ title, icon: Icon, description }) => {
  return (
    <div style={{
      marginBottom: '2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      paddingBottom: '1.5rem',
      borderBottom: '2px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '60px',
        height: '60px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #003466 0%, #174385 100%)',
        color: 'white',
        fontSize: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 52, 102, 0.3)'
      }}>
        <Icon />
      </div>
      <div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#212c59',
          margin: '0 0 0.5rem 0',
          fontFamily: "'Montserrat', sans-serif"
        }}>
          {title}
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#6c757d',
          margin: '0',
          fontFamily: "'Montserrat', sans-serif"
        }}>
          {description}
        </p>
      </div>
    </div>
  );
};

// Icon mapping for different pages
export const getPageIcon = (pageName) => {
  const iconMap = {
    'Admin Dashboard': BarChart3,
    'Manage Admins': Users,
    'Menu Management': Coffee,
    'Reward Management': Gift,
    'Promo Management': Star,
    'Customer Feedback': MessageSquare
  };
  return iconMap[pageName] || Users;
};

// Description mapping for different pages
export const getPageDescription = (pageName) => {
  const descriptionMap = {
    'Admin Dashboard': 'Overview of your cafe management system',
    'Manage Admins': 'Manage admin accounts and permissions',
    'Menu Management': 'Add, edit, and manage menu items',
    'Reward Management': 'Configure rewards and loyalty programs',
    'Promo Management': 'Create and manage promotional offers',
    'Customer Feedback': 'View and respond to customer feedback'
  };
  return descriptionMap[pageName] || 'Admin management page';
};

export default PageHeader;
