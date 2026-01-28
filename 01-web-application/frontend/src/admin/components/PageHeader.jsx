import React from 'react';
import { BarChart3, Users, Coffee, Gift, Star, MessageSquare, Grid3X3 } from 'lucide-react';

const PageHeader = ({ title, icon: Icon, description }) => {
  return (
    <div style={{
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '45px',
        height: '45px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #003466 0%, #174385 100%)',
        color: 'white',
        fontSize: '1.2rem',
        boxShadow: '0 2px 10px rgba(0, 52, 102, 0.2)'
      }}>
        <Icon />
      </div>
      <div>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#212c59',
          margin: '0',
          fontFamily: "'Montserrat', sans-serif"
        }}>
          {title}
        </h1>
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
    'Customer Feedback': MessageSquare,
    'Gallery Management': Grid3X3
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
    'Customer Feedback': 'View and respond to customer feedback',
    'Gallery Management': 'Create and manage gallery posts with images and videos'
  };
  return descriptionMap[pageName] || 'Admin management page';
};

export default PageHeader;
