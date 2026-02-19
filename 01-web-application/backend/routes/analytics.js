const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Feedback = require('../models/Feedback');
const MenuItem = require('../models/MenuItem');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/authMiddleware');
const ActivityService = require('../services/activityService');

// =============================================================================
// BEST SELLER ANALYTICS – DATA SOURCE (same for daily, weekly, monthly, yearly)
// =============================================================================
// Collection: users (User model)
// Field: pastOrders (array of { drink: string, quantity: number, date: Date })
// Date field used for filtering: pastOrders.date
// All periods (today, week, month, year) use this same collection and date field;
// only the date range (start/end) changes via getDateRangeForPeriod().
// =============================================================================

/**
 * Returns start and end dates for best-seller period filtering.
 * Used by both /best-sellers and /best-sellers-by-category so all periods share the same logic.
 * @param {string} period - 'today' | 'week' | 'month' | 'year'
 * @returns {{ startDate: Date, endDate: Date } | null}
 */
function getDateRangeForPeriod(period) {
  const now = new Date();
  let startDate;
  let endDate;
  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToSunday);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      return null;
  }
  return { startDate, endDate };
}

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

// Helper function to categorize age into ranges (minimum 13 years old)
const categorizeAge = (age) => {
  if (age < 13) return null; // Exclude under 13 from age distribution
  if (age >= 13 && age <= 17) return '13-17';
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
      '13-17': 0,
      '18-25': 0,
      '26-32': 0,
      '33-40': 0,
      '41+': 0
    };

    users.forEach(user => {
      if (user.birthday) {
        const age = calculateAge(user.birthday);
        const range = categorizeAge(age);
        if (range && ageRanges[range] !== undefined) {
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

// Get users with spending data from orders collection
router.get('/users-with-spending', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Aggregate spending data from orders (support userId/totalAmount and customerId/transactionTotal)
    const spendingData = await Order.aggregate([
      {
        $addFields: {
          amount: { $ifNull: ['$totalAmount', '$transactionTotal'] },
          userRef: { $ifNull: ['$userId', '$customerId'] }
        }
      },
      {
        $match: {
          userRef: { $exists: true, $ne: null },
          amount: { $exists: true, $gt: 0 },
          $or: [
            { status: 'completed' },
            { status: { $exists: false } },
            { status: null }
          ]
        }
      },
      {
        $group: {
          _id: '$userRef',
          totalSpent: { $sum: '$amount' },
          ordersCount: { $sum: 1 },
          lastOrderDate: { $max: { $ifNull: ['$orderDate', '$createdAt'] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $match: { 'user.role': 'Customer' }
      },
      {
        $project: {
          name: '$user.fullName',
          email: '$user.email',
          employmentStatus: '$user.employmentStatus',
          ordersCount: 1,
          totalSpent: 1,
          lastOrderDate: 1,
          joinedDate: '$user.createdAt',
          hasOrders: { $gt: ['$ordersCount', 0] }
        }
      },
      {
        $sort: { totalSpent: -1 }
      },
      {
        $limit: 50
      }
    ]);

    res.json(spendingData);
  } catch (error) {
    console.error('Error fetching users with spending:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get highest spenders by employment status - using orders collection only
// Supports both schemas: (userId, totalAmount, status, employmentStatus) and (customerId, transactionTotal)
router.get('/highest-spenders-by-employment', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Normalize order fields: amount and user ref (barista/mobile may use customerId + transactionTotal)
    const spendingByEmployment = await Order.aggregate([
      {
        $addFields: {
          amount: { $ifNull: ['$totalAmount', '$transactionTotal'] },
          userRef: { $ifNull: ['$userId', '$customerId'] }
        }
      },
      {
        $match: {
          userRef: { $exists: true, $ne: null },
          amount: { $exists: true, $gt: 0 },
          $or: [
            { status: 'completed' },
            { status: { $exists: false } },
            { status: null }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userRef',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $addFields: {
          employmentStatus: { $ifNull: ['$employmentStatus', '$user.employmentStatus'] }
        }
      },
      {
        $match: {
          employmentStatus: { $in: ['Employed', 'Student'] }
        }
      },
      {
        $group: {
          _id: '$employmentStatus',
          totalSpent: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          users: { $addToSet: '$userRef' }
        }
      },
      {
        $project: {
          employmentStatus: '$_id',
          totalSpent: 1,
          totalOrders: 1,
          userCount: { $size: '$users' },
          averageSpent: {
            $cond: [
              { $gt: [{ $size: '$users' }, 0] },
              { $divide: ['$totalSpent', { $size: '$users' }] },
              0
            ]
          }
        }
      }
    ]);

    // Always return both Employed and Student (real data; use 0 when no orders)
    const byStatus = {};
    spendingByEmployment.forEach((row) => {
      byStatus[row.employmentStatus] = row;
    });
    const result = [
      byStatus['Employed'] || { employmentStatus: 'Employed', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 },
      byStatus['Student'] || { employmentStatus: 'Student', totalSpent: 0, totalOrders: 0, userCount: 0, averageSpent: 0 }
    ];

    res.json(result);
  } catch (error) {
    console.error('Error fetching highest spenders by employment:', error);
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

    // Compute averageSpent based on real orders collection
    let averageSpent = 0;
    let totalOrders = 0;
    try {
      // Get statistics from actual orders collection
      const orderStats = await Order.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      if (orderStats.length > 0) {
        totalOrders = orderStats[0].totalOrders;
        const totalAmount = orderStats[0].totalAmount;
        
        // Calculate average spent per order
        if (totalOrders > 0) {
          averageSpent = totalAmount / totalOrders;
        }
      }
    } catch (calcErr) {
      console.error('Error calculating average spent:', calcErr);
      // Fail silently for averageSpent so dashboard still loads
      averageSpent = 0;
    }

    res.json({
      totalCustomers,
      totalFeedback,
      pendingFeedback,
      totalMenuItems,
      activeMenuItems,
      newCustomersThisMonth,
      totalOrders,
      averageSpent: Number.isFinite(averageSpent) ? Number(averageSpent.toFixed(2)) : 0
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

// Get best seller items analytics (data source: users.pastOrders – see comment at top of file)
router.get('/best-sellers', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = 'all', limit = 10 } = req.query;
    
    // Same date range logic for all periods: users.pastOrders.date
    let dateFilter = {};
    if (period !== 'all') {
      const range = getDateRangeForPeriod(period);
      if (range) {
        dateFilter = { 'pastOrders.date': { $gte: range.startDate, $lte: range.endDate } };
      }
    }

    // Aggregate past orders (users collection) to get best sellers
    const bestSellers = await User.aggregate([
      { $match: { role: 'Customer' } },
      { $unwind: '$pastOrders' },
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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

// Get best seller items by category (data source: users.pastOrders – same as best-sellers)
router.get('/best-sellers-by-category', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { period = 'all', limit = 5 } = req.query;
    
    // Same date range and collection as /best-sellers
    let dateFilter = {};
    if (period !== 'all') {
      const range = getDateRangeForPeriod(period);
      if (range) {
        dateFilter = { 'pastOrders.date': { $gte: range.startDate, $lte: range.endDate } };
      }
    }

    // Build map: menu item name -> category (exact and lowercase so pastOrders match)
    const menuItems = await MenuItem.find({ status: 'active' }).lean();
    const drinkToCategory = {};
    menuItems.forEach((menuItem) => {
      const name = (menuItem.name != null ? String(menuItem.name) : '').trim();
      const cat = menuItem.category;
      if (!name || !cat) return;
      drinkToCategory[name] = cat;
      const nameLower = name.toLowerCase();
      if (!drinkToCategory[nameLower]) drinkToCategory[nameLower] = cat;
    });

    // Aggregate past orders
    const bestSellersByCategory = await User.aggregate([
      { $match: { role: 'Customer' } },
      { $unwind: '$pastOrders' },
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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

    // Group by category using menu item category; skip unknown items (do not show in By Category)
    const categoryStats = {};
    const validCategories = ['Donuts', 'Drinks', 'Pastries', 'Pizzas'];
    bestSellersByCategory.forEach(item => {
      const rawName = item.itemName != null ? String(item.itemName).trim() : '';
      if (!rawName) return;
      const nameKeyLower = rawName.toLowerCase();
      const category = drinkToCategory[rawName] || drinkToCategory[nameKeyLower];

      // Unknown item (not in menu): skip so it does not appear in By Category at all
      if (!category) {
        return;
      }

      // Only allow valid menu categories (Donuts, Drinks, Pastries, Pizzas)
      if (!validCategories.includes(category)) {
        return;
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

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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

// Cleaned up debug statements and test files
router.get('/top-spenders-by-employment', authMiddleware, async (req, res) => {
  try {
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get orders that are completed or have transactionTotal (barista/mobile schema)
    const allCompletedOrders = await Order.find({
      $or: [
        { status: 'completed' },
        { transactionTotal: { $exists: true, $gt: 0 } }
      ]
    }).lean();

    // Get all users with their employment status
    const allUsers = await User.find({
      role: 'Customer',
      employmentStatus: { $in: ['Student', 'Employed'] }
    }).lean();

    const userEmploymentMap = {};
    allUsers.forEach(user => {
      userEmploymentMap[user._id.toString()] = user.employmentStatus;
    });

    // Group orders by user and calculate spending (support userId/customerId and totalAmount/transactionTotal)
    const userSpending = {};
    allCompletedOrders.forEach(order => {
      const userId = (order.userId || order.customerId)?.toString();
      if (!userId) return;
      const employmentStatus = userEmploymentMap[userId];
      const amount = Number(order.totalAmount ?? order.transactionTotal ?? 0);
      if (amount <= 0) return;

      if (employmentStatus && ['Student', 'Employed'].includes(employmentStatus)) {
        if (!userSpending[userId]) {
          userSpending[userId] = {
            userId: userId,
            employmentStatus: employmentStatus,
            totalSpent: 0,
            totalOrders: 0
          };
        }
        userSpending[userId].totalSpent += amount;
        userSpending[userId].totalOrders += 1;
      }
    });

    // Find top spender for each employment status
    const topSpendersByEmployment = [];
    const studentSpenders = Object.values(userSpending).filter(u => u.employmentStatus === 'Student');
    const employedSpenders = Object.values(userSpending).filter(u => u.employmentStatus === 'Employed');

    if (studentSpenders.length > 0) {
      const topStudent = studentSpenders.reduce((max, current) =>
        current.totalSpent > max.totalSpent ? current : max
      );
      topSpendersByEmployment.push({
        employmentStatus: 'Student',
        topSpender: topStudent
      });
    }

    if (employedSpenders.length > 0) {
      const topEmployed = employedSpenders.reduce((max, current) =>
        current.totalSpent > max.totalSpent ? current : max
      );
      topSpendersByEmployment.push({
        employmentStatus: 'Employed',
        topSpender: topEmployed
      });
    }


    res.json(topSpendersByEmployment);
  } catch (error) {
    console.error('❌ [ANALYTICS] Top Spenders by Employment API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
