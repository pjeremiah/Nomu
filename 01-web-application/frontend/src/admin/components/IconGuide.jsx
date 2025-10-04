// Admin Page Icons Guide
// This file documents all the icons used across admin pages for consistency

import { 
  FaChartLine,    // Admin Dashboard - Analytics/Charts
  FaUsers,        // Manage Admins - User Management
  FaCoffee,       // Menu Management - Food/Drinks
  FaGift,         // Reward Management - Rewards/Gifts
  FaStar,         // Promo Management - Promotions/Offers
  FaComments      // Customer Feedback - Communication
} from 'react-icons/fa';

// Icon Specifications:
// - All icons are from react-icons/fa (FontAwesome)
// - Consistent size: 1.5rem (24px)
// - Same styling: White color on gradient background
// - Same container: 60px × 60px with rounded corners
// - Same gradient: linear-gradient(135deg, #003466 0%, #174385 100%)

export const ADMIN_PAGE_ICONS = {
  'Admin Dashboard': {
    icon: FaChartLine,
    description: 'Analytics and data visualization',
    reason: 'Represents charts, graphs, and data analysis - perfect for dashboard'
  },
  'Manage Admins': {
    icon: FaUsers,
    description: 'User and admin management',
    reason: 'Represents multiple users and admin accounts'
  },
  'Menu Management': {
    icon: FaCoffee,
    description: 'Food and beverage management',
    reason: 'Represents cafe items, food, and drinks'
  },
  'Reward Management': {
    icon: FaGift,
    description: 'Rewards and loyalty programs',
    reason: 'Represents gifts, rewards, and special offers'
  },
  'Promo Management': {
    icon: FaStar,
    description: 'Promotions and marketing',
    reason: 'Represents featured items, promotions, and special deals'
  },
  'Customer Feedback': {
    icon: FaComments,
    description: 'Customer communication',
    reason: 'Represents messages, feedback, and customer interaction'
  }
};

export default ADMIN_PAGE_ICONS;
