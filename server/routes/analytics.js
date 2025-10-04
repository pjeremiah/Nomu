const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const MenuItem = require('../models/MenuItem');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/authMiddleware');
const ActivityService = require('../services/activityService');

// Helper function to calculate age from birthday
const calculateAge = (birthday) => {
  const today = new Date();
  const birthDate = new Date(birthday);
  
  // Handle future dates - if birthday is in the future, return 0
  if (birthDate > today) {
    return 0;
  }
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Ensure age is not negative
  return Math.max(0, age);
};

// Helper function to categorize age into ranges
const categorizeAge = (age) => {
  if (age === 0) return '1-17'; // Handle future birthdays as young users
  if (age >= 1 && age <= 17) return '1-17';
  if (age >= 18 && age <= 25) return '18-25';
  if (age >= 26 && age <= 32) return '26-32';
  if (age >= 33 && age <= 40) return '33-40';
  if (age >= 41) return '41+';
  return 'Unknown';
};

// Get gender distribution
router.get('/gender', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const genderStats = await User.aggregate([
      { $match: { role: 'Customer', gender: { $in: ['Male', 'Female'] } } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
      { $sort: { _id: 1 } } // Sort alphabetically: Female, Male
    ]);

    res.json(genderStats);
  } catch (error) {
    console.error('❌ [ANALYTICS] Gender API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get employment status distribution
router.get('/employment', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employmentStats = await User.aggregate([
      { $match: { role: 'Customer', employmentStatus: { $ne: 'Prefer not to say' } } },
      { $group: { _id: '$employmentStatus', count: { $sum: 1 } } },
      { $sort: { _id: 1 } } // Sort alphabetically: Employed, Student, Unemployed
    ]);

    res.json(employmentStats);
  } catch (error) {
    console.error('❌ [ANALYTICS] Employment API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get age range distribution
router.get('/age-ranges', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find({ role: 'Customer' });
    
    const ageRanges = {
      '1-17': 0,
      '18-25': 0,
      '26-32': 0,
      '33-40': 0,
      '41+': 0
    };

    users.forEach(user => {
      if (user.birthday) {
        const age = calculateAge(user.birthday);
        const range = categorizeAge(age);
        if (ageRanges[range] !== undefined) {
          ageRanges[range]++;
        }
      }
    });

    const ageStats = Object.entries(ageRanges).map(([range, count]) => ({
      _id: range,
      count
    }));

    res.json(ageStats);
  } catch (error) {
    console.error('❌ [ANALYTICS] Age Ranges API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get sign-up growth over time
router.get('/signup-growth', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = 'monthly' } = req.query;
    
    let dateFormat;
    let groupBy;
    
    if (period === 'weekly') {
      dateFormat = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
      groupBy = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
    } else if (period === 'daily') {
      dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else {
      // monthly (default)
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
      groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    }

    const signupStats = await User.aggregate([
      { $match: { role: 'Customer' } },
      { $group: { _id: groupBy, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(signupStats);
  } catch (error) {
    console.error('❌ [ANALYTICS] Signup Growth API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get overall customer statistics
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalCustomers = await User.countDocuments({ role: 'Customer' });
    const newCustomersThisMonth = await User.countDocuments({
      role: 'Customer',
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    res.json({
      totalCustomers,
      newCustomersThisMonth
    });
  } catch (error) {

    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get total customers
    const totalCustomers = await User.countDocuments({ role: 'Customer' });

    // Get feedback statistics
    const totalFeedback = await Feedback.countDocuments();
    const pendingFeedback = await Feedback.countDocuments({ status: 'pending' });

    // Get menu statistics
    const totalMenuItems = await MenuItem.countDocuments();
    const activeMenuItems = await MenuItem.countDocuments({ status: 'active' });

    // Get new customers this month
    const newCustomersThisMonth = await User.countDocuments({
      role: 'Customer',
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    res.json({
      totalCustomers,
      totalFeedback,
      pendingFeedback,
      totalMenuItems,
      activeMenuItems,
      newCustomersThisMonth
    });
  } catch (error) {

    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get recent activity
router.get('/recent-activity', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ensure admin activities are cleaned up before fetching
    await ActivityService.cleanupOldActivities();

    const activities = [];

    // Get admin activities from the activity service (limit to 20)
    const adminActivities = await ActivityService.getRecentActivities(20);
    activities.push(...adminActivities);

    // Get recent user registrations
    const recentUsers = await User.find({ role: 'Customer' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName createdAt');

    recentUsers.forEach(user => {
      const timeAgo = getTimeAgo(user.createdAt);
      // Show activities from the last 7 days
      if (timeAgo.includes('minute') || timeAgo.includes('hour') || timeAgo.includes('day') || timeAgo.includes('week')) {
        activities.push({
          action: `New customer registration: ${user.fullName}`,
          time: timeAgo,
          type: 'user',
          timestamp: user.createdAt
        });
      }
    });

    // Get recent feedback
    const recentFeedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name status createdAt');

    recentFeedback.forEach(feedback => {
      const timeAgo = getTimeAgo(feedback.createdAt);
      // Show activities from the last 7 days
      if (timeAgo.includes('minute') || timeAgo.includes('hour') || timeAgo.includes('day') || timeAgo.includes('week')) {
        activities.push({
          action: `Customer feedback received from ${feedback.name}`,
          time: timeAgo,
          type: 'feedback',
          timestamp: feedback.createdAt
        });
      }
    });

    // Get recent menu updates
    const recentMenuItems = await MenuItem.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name updatedAt createdAt');

    recentMenuItems.forEach(item => {
      const timeAgo = getTimeAgo(item.updatedAt);
      // Show activities from the last 7 days
      if (timeAgo.includes('minute') || timeAgo.includes('hour') || timeAgo.includes('day') || timeAgo.includes('week')) {
        // Check if this is a new item (createdAt and updatedAt are very close)
        const isNewItem = Math.abs(new Date(item.updatedAt) - new Date(item.createdAt)) <= 60000; // 1 minute
        
        if (isNewItem) {
          activities.push({
            action: `New menu item added: ${item.name}`,
            time: timeAgo,
            type: 'menu',
            timestamp: item.updatedAt
          });
        } else {
          activities.push({
            action: `Menu item updated: ${item.name}`,
            time: timeAgo,
            type: 'menu',
            timestamp: item.updatedAt
          });
        }
      }
    });

    // Get recent admin activities (new admin accounts created)
    const recentAdmins = await Admin.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName role createdAt');

    recentAdmins.forEach(admin => {
      const timeAgo = getTimeAgo(admin.createdAt);
      // Show activities from the last 7 days
      if (timeAgo.includes('minute') || timeAgo.includes('hour') || timeAgo.includes('day') || timeAgo.includes('week')) {
        activities.push({
          action: `New ${admin.role} account created: ${admin.fullName}`,
          time: timeAgo,
          type: 'admin',
          timestamp: admin.createdAt
        });
      }
    });

    // Sort all activities by timestamp and take the most recent 20
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivities = activities.slice(0, 20);
    
    res.json(recentActivities);
  } catch (error) {
    console.error('❌ [ANALYTICS] Recent Activity API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get best seller items analytics
router.get('/best-sellers', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = 'all', limit = 10 } = req.query;
    
    // Build date filter based on period
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      }
      
      dateFilter = { 'pastOrders.date': { $gte: startDate } };
    }


    // Aggregate past orders to get best sellers
    const bestSellers = await User.aggregate([
      { $match: { role: 'Customer', ...dateFilter } },
      { $unwind: '$pastOrders' },
      { $match: dateFilter.pastOrders ? { 'pastOrders.date': dateFilter['pastOrders.date'] } : {} },
      { 
        $group: { 
          _id: '$pastOrders.drink',
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$pastOrders.quantity' },
          uniqueCustomers: { $addToSet: '$_id' }
        } 
      },
      { 
        $project: { 
          itemName: '$_id',
          totalOrders: 1,
          totalQuantity: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          _id: 0
        } 
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);


    // Get additional statistics
    const totalOrders = bestSellers.reduce((sum, item) => sum + item.totalOrders, 0);
    const totalQuantity = bestSellers.reduce((sum, item) => sum + item.totalQuantity, 0);
    const totalUniqueItems = bestSellers.length;

    // Calculate percentages
    const bestSellersWithPercentage = bestSellers.map(item => ({
      ...item,
      orderPercentage: totalOrders > 0 ? ((item.totalOrders / totalOrders) * 100).toFixed(2) : 0,
      quantityPercentage: totalQuantity > 0 ? ((item.totalQuantity / totalQuantity) * 100).toFixed(2) : 0
    }));

    res.json({
      bestSellers: bestSellersWithPercentage,
      summary: {
        totalOrders,
        totalQuantity,
        totalUniqueItems,
        period,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ [ANALYTICS] Best Sellers API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get best seller items by category
router.get('/best-sellers-by-category', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = 'all', limit = 5 } = req.query;
    
    // Build date filter based on period
    let dateFilter = {};
    if (period !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      dateFilter = { 'pastOrders.date': { $gte: startDate } };
    }


    // Get all menu items to map drink names to categories
    const menuItems = await MenuItem.find({ status: 'active' });
    const drinkToCategory = {};
    menuItems.forEach(item => {
      drinkToCategory[item.name] = item.category;
    });

    // Aggregate past orders
    const bestSellersByCategory = await User.aggregate([
      { $match: { role: 'Customer', ...dateFilter } },
      { $unwind: '$pastOrders' },
      { $match: dateFilter.pastOrders ? { 'pastOrders.date': dateFilter['pastOrders.date'] } : {} },
      { 
        $group: { 
          _id: '$pastOrders.drink',
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$pastOrders.quantity' },
          uniqueCustomers: { $addToSet: '$_id' }
        } 
      },
      { 
        $project: { 
          itemName: '$_id',
          totalOrders: 1,
          totalQuantity: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          _id: 0
        } 
      },
      { $sort: { totalQuantity: -1 } }
    ]);

    // Group by category
    const categoryStats = {};
    bestSellersByCategory.forEach(item => {
      let category = drinkToCategory[item.itemName] || 'Unknown';
      
      // Enhanced special handling: if item contains pizza-related terms, categorize as "Pizzas"
      if (item.itemName && (
        item.itemName.toLowerCase().includes('pizza') ||
        item.itemName.toLowerCase().includes('pizzetta') ||
        item.itemName.toLowerCase().includes('pizazzetta') ||
        item.itemName.toLowerCase().includes('cheese') && item.itemName.toLowerCase().includes('(') ||
        item.itemName.toLowerCase().includes('pesto') && item.itemName.toLowerCase().includes('(') ||
        item.itemName.toLowerCase().includes('spinach') && item.itemName.toLowerCase().includes('(') ||
        item.itemName.toLowerCase().includes('salame') && item.itemName.toLowerCase().includes('(') ||
        item.itemName.toLowerCase().includes('(12th)') ||
        item.itemName.toLowerCase().includes('(pizzetta)') ||
        item.itemName.toLowerCase().includes('(pizazzetta)')
      )) {
        category = 'Pizzas';
      }
      
      // Map "Unknown" category to "Pizzas" to consolidate categories
      if (category === 'Unknown') {
        category = 'Pizzas';
      }
      
      // Only include valid categories: Donuts, Drinks, Pastries, Pizzas
      const validCategories = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];
      if (!validCategories.includes(category)) {
        category = 'Pizzas'; // Default to Pizzas for any other categories
      }
      
      if (!categoryStats[category]) {
        categoryStats[category] = [];
      }
      categoryStats[category].push(item);
    });

    // Sort items within each category and limit
    Object.keys(categoryStats).forEach(category => {
      categoryStats[category] = categoryStats[category]
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, parseInt(limit));
    });

    // Calculate category totals
    const categoryTotals = {};
    Object.keys(categoryStats).forEach(category => {
      categoryTotals[category] = {
        totalOrders: categoryStats[category].reduce((sum, item) => sum + item.totalOrders, 0),
        totalQuantity: categoryStats[category].reduce((sum, item) => sum + item.totalQuantity, 0),
        totalItems: categoryStats[category].length,
        topItem: categoryStats[category][0]?.itemName || 'N/A'
      };
    });

    res.json({
      categories: categoryStats,
      categoryTotals,
      summary: {
        period,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ [ANALYTICS] Best Sellers by Category API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get sales trends over time
router.get('/sales-trends', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = 'monthly', itemName } = req.query;
    
    let dateFormat;
    let groupBy;
    
    if (period === 'daily') {
      dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$pastOrders.date" } };
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$pastOrders.date" } };
    } else if (period === 'weekly') {
      dateFormat = { $dateToString: { format: "%Y-%U", date: "$pastOrders.date" } };
      groupBy = { $dateToString: { format: "%Y-%U", date: "$pastOrders.date" } };
    } else {
      // monthly (default)
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$pastOrders.date" } };
      groupBy = { $dateToString: { format: "%Y-%m", date: "$pastOrders.date" } };
    }


    const matchStage = { role: 'Customer' };
    if (itemName) {
      matchStage['pastOrders.drink'] = itemName;
    }

    const salesTrends = await User.aggregate([
      { $match: matchStage },
      { $unwind: '$pastOrders' },
      { 
        $group: { 
          _id: groupBy,
          totalOrders: { $sum: 1 },
          totalQuantity: { $sum: '$pastOrders.quantity' },
          uniqueCustomers: { $addToSet: '$_id' }
        } 
      },
      { 
        $project: { 
          period: '$_id',
          totalOrders: 1,
          totalQuantity: 1,
          uniqueCustomers: { $size: '$uniqueCustomers' },
          _id: 0
        } 
      },
      { $sort: { period: 1 } }
    ]);


    res.json({
      trends: salesTrends,
      summary: {
        period,
        itemName: itemName || 'All Items',
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ [ANALYTICS] Sales Trends API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Helper function to calculate time ago
function getTimeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
}

module.exports = router;
