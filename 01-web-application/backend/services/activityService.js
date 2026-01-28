const mongoose = require('mongoose');
const AdminActivity = require('../models/AdminActivity');
const Admin = require('../models/Admin');

class ActivityService {
  /**
   * Log an admin activity
   * @param {Object} params - Activity parameters
   * @param {string} params.adminId - ID of the admin performing the action
   * @param {string} params.action - Description of the action performed
   * @param {string} params.entityType - Type of entity affected (promo, menu, user, etc.)
   * @param {string} params.entityId - ID of the affected entity (optional)
   * @param {string} params.entityName - Name of the affected entity (optional)
   * @param {string} params.details - Additional details (optional)
   */
  static async logActivity({ adminId, action, entityType, entityId, entityName, details }) {
    try {
      // Get admin name if adminId is provided
      let adminName = 'System';
      if (adminId) {
        const admin = await Admin.findById(adminId).select('fullName');
        adminName = admin ? admin.fullName : 'Unknown Admin';
      }

      // Create activity log
      const activity = new AdminActivity({
        adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
        adminName,
        action,
        entityType,
        entityId: entityId ? new mongoose.Types.ObjectId(entityId) : null,
        entityName,
        details,
        timestamp: new Date()
      });

      await activity.save();
      
      // Clean up old activities to maintain 20 activity limit
      await this.cleanupOldActivities();
      
      return activity;
    } catch (error) {
      console.error('❌ [ACTIVITY] Error logging activity:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  /**
   * Get recent activities for dashboard
   * @param {number} limit - Number of activities to return (default: 20)
   * @param {string} entityType - Filter by entity type (optional)
   */
  static async getRecentActivities(limit = 20, entityType = null) {
    try {
      const query = {};
      if (entityType) {
        query.entityType = entityType;
      }

      const activities = await AdminActivity.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('adminName action entityType entityName details timestamp');

      return activities.map(activity => ({
        action: activity.action,
        time: this.getTimeAgo(activity.timestamp),
        type: activity.entityType,
        timestamp: activity.timestamp,
        adminName: activity.adminName,
        entityName: activity.entityName,
        details: activity.details
      }));
    } catch (error) {
      console.error('❌ [ACTIVITY] Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Clean up old activities to maintain 20 activity limit
   * This method deletes the oldest activities when the total count exceeds 20
   */
  static async cleanupOldActivities() {
    try {
      const ACTIVITY_LIMIT = 20;
      
      // Count total activities
      const totalActivities = await AdminActivity.countDocuments();
      
      if (totalActivities > ACTIVITY_LIMIT) {
        // Get the oldest activities that need to be deleted
        const activitiesToDelete = totalActivities - ACTIVITY_LIMIT;
        
        // Find the oldest activities to delete
        const oldestActivities = await AdminActivity.find()
          .sort({ timestamp: 1 }) // Sort by oldest first
          .limit(activitiesToDelete)
          .select('_id');
        
        if (oldestActivities.length > 0) {
          // Delete the oldest activities
          const deleteResult = await AdminActivity.deleteMany({
            _id: { $in: oldestActivities.map(activity => activity._id) }
          });
          
        }
      }
    } catch (error) {
      console.error('❌ [ACTIVITY] Error cleaning up old activities:', error);
      // Don't throw error to prevent breaking the main operation
    }
  }

  /**
   * Get time ago string
   * @param {Date} date - Date to calculate time ago from
   */
  static getTimeAgo(date) {
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

  /**
   * Log promotion-related activities
   */
  static async logPromoActivity(adminId, action, promo, details = '') {
    return this.logActivity({
      adminId,
      action,
      entityType: 'promo',
      entityId: promo._id || promo.id ? new mongoose.Types.ObjectId(promo._id || promo.id) : null,
      entityName: promo.title,
      details
    });
  }

  /**
   * Log menu-related activities
   */
  static async logMenuActivity(adminId, action, menuItem, details = '') {
    return this.logActivity({
      adminId,
      action,
      entityType: 'menu',
      entityId: menuItem._id || menuItem.id ? new mongoose.Types.ObjectId(menuItem._id || menuItem.id) : null,
      entityName: menuItem.name,
      details
    });
  }

  /**
   * Log user-related activities
   */
  static async logUserActivity(adminId, action, user, details = '') {
    return this.logActivity({
      adminId,
      action,
      entityType: 'user',
      entityId: user._id || user.id ? new mongoose.Types.ObjectId(user._id || user.id) : null,
      entityName: user.fullName,
      details
    });
  }

  /**
   * Log admin-related activities
   */
  static async logAdminActivity(adminId, action, admin, details = '') {
    return this.logActivity({
      adminId,
      action,
      entityType: 'admin',
      entityId: admin._id || admin.id,
      entityName: admin.fullName,
      details
    });
  }
}

module.exports = ActivityService;
