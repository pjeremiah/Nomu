const mongoose = require('mongoose');

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  action: {
    type: String,
    required: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['user', 'order', 'product', 'system']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityName: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  source: {
    type: String,
    enum: ['web', 'mobile', 'system'],
    default: 'web'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

class ActivityService {
  /**
   * Log a user activity
   * @param {Object} activityData - The activity data to log
   * @param {string} activityData.adminId - ID of the admin who performed the action (null for system actions)
   * @param {string} activityData.action - Description of the action performed
   * @param {string} activityData.entityType - Type of entity affected (user, order, product, system)
   * @param {string} activityData.entityId - ID of the entity affected
   * @param {string} activityData.entityName - Name of the entity affected
   * @param {string} activityData.details - Additional details about the action
   * @param {string} activityData.source - Source of the action (web, mobile, system)
   */
  static async logActivity(activityData) {
    try {
      const activity = new ActivityLog({
        adminId: activityData.adminId || null,
        action: activityData.action,
        entityType: activityData.entityType,
        entityId: activityData.entityId,
        entityName: activityData.entityName,
        details: activityData.details || '',
        source: activityData.source || 'web',
        timestamp: new Date()
      });

      await activity.save();
      console.log(`📝 Activity logged: ${activityData.action}`);
      return activity;
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Get recent activities
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of activities to return (default: 50)
   * @param {string} options.entityType - Filter by entity type
   * @param {string} options.source - Filter by source
   * @param {Date} options.since - Get activities since this date
   */
  static async getRecentActivities(options = {}) {
    try {
      const {
        limit = 50,
        entityType,
        source,
        since
      } = options;

      const query = {};
      
      if (entityType) query.entityType = entityType;
      if (source) query.source = source;
      if (since) query.timestamp = { $gte: since };

      const activities = await ActivityLog
        .find(query)
        .populate('adminId', 'fullName username email')
        .sort({ timestamp: -1 })
        .limit(limit);

      return activities;
    } catch (error) {
      console.error('❌ Failed to get recent activities:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @param {Object} options - Query options
   * @param {Date} options.since - Get statistics since this date
   * @param {Date} options.until - Get statistics until this date
   */
  static async getActivityStats(options = {}) {
    try {
      const { since, until } = options;
      
      const query = {};
      if (since || until) {
        query.timestamp = {};
        if (since) query.timestamp.$gte = since;
        if (until) query.timestamp.$lte = until;
      }

      const stats = await ActivityLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              entityType: '$entityType',
              source: '$source'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: null,
            byEntityType: {
              $push: {
                entityType: '$_id.entityType',
                source: '$_id.source',
                count: '$count'
              }
            },
            totalActivities: { $sum: '$count' }
          }
        }
      ]);

      return stats[0] || { byEntityType: [], totalActivities: 0 };
    } catch (error) {
      console.error('❌ Failed to get activity stats:', error);
      throw error;
    }
  }

  /**
   * Log user registration activity
   * @param {Object} user - The user object
   * @param {string} source - Source of registration (web, mobile)
   */
  static async logUserRegistration(user, source = 'web') {
    return await this.logActivity({
      adminId: null,
      action: `New customer registered via ${source} app: ${user.fullName}`,
      entityType: 'user',
      entityId: user._id,
      entityName: user.fullName,
      details: `${source} app registration`,
      source: source
    });
  }

  /**
   * Log user login activity
   * @param {Object} user - The user object
   * @param {string} source - Source of login (web, mobile)
   */
  static async logUserLogin(user, source = 'web') {
    return await this.logActivity({
      adminId: null,
      action: `Customer logged in via ${source} app: ${user.fullName}`,
      entityType: 'user',
      entityId: user._id,
      entityName: user.fullName,
      details: `${source} app login`,
      source: source
    });
  }

  /**
   * Log admin action
   * @param {Object} admin - The admin user object
   * @param {string} action - Description of the action
   * @param {Object} entity - The entity being acted upon
   * @param {string} source - Source of the action (web, mobile)
   */
  static async logAdminAction(admin, action, entity, source = 'web') {
    return await this.logActivity({
      adminId: admin._id,
      action: `${admin.fullName} ${action}`,
      entityType: entity.type,
      entityId: entity.id,
      entityName: entity.name,
      details: `Admin action via ${source} app`,
      source: source
    });
  }
}

module.exports = ActivityService;
