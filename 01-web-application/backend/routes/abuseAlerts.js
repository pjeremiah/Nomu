const express = require('express');
const router = express.Router();
const AbuseAlert = require('../models/AbuseAlert');
const authMiddleware = require('../middleware/authMiddleware');

// Get all abuse alerts (admin only)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { 
      page = 1, 
      limit = 20, 
      status = 'new', 
      severity, 
      employeeId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (severity) filter.severity = severity;
    if (employeeId) filter.employeeId = employeeId;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get alerts with pagination
    const alerts = await AbuseAlert.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await AbuseAlert.countDocuments(filter);

    // Get summary statistics
    const stats = await AbuseAlert.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const severityStats = await AbuseAlert.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      alerts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      stats: {
        byStatus: stats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        bySeverity: severityStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching abuse alerts:', error);
    res.status(500).json({ error: 'Failed to fetch abuse alerts' });
  }
});

// Get recent abuse alerts (for dashboard)
router.get('/recent', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const limit = parseInt(req.query.limit) || 10;
    const alerts = await AbuseAlert.find({ status: 'new' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching recent abuse alerts:', error);
    res.status(500).json({ error: 'Failed to fetch recent abuse alerts' });
  }
});

// Acknowledge an abuse alert
router.patch('/:id/acknowledge', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const alert = await AbuseAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Abuse alert not found' });
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = req.user.id;
    alert.acknowledgedAt = new Date();
    await alert.save();

    res.json({ message: 'Alert acknowledged successfully', alert });
  } catch (error) {
    console.error('Error acknowledging abuse alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge abuse alert' });
  }
});

// Resolve an abuse alert
router.patch('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const alert = await AbuseAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Abuse alert not found' });
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    await alert.save();

    res.json({ message: 'Alert resolved successfully', alert });
  } catch (error) {
    console.error('Error resolving abuse alert:', error);
    res.status(500).json({ error: 'Failed to resolve abuse alert' });
  }
});

// Dismiss an abuse alert
router.patch('/:id/dismiss', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const alert = await AbuseAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: 'Abuse alert not found' });
    }

    alert.status = 'dismissed';
    await alert.save();

    res.json({ message: 'Alert dismissed successfully', alert });
  } catch (error) {
    console.error('Error dismissing abuse alert:', error);
    res.status(500).json({ error: 'Failed to dismiss abuse alert' });
  }
});

// Create a new abuse alert (for mobile barista backend to call)
router.post('/', async (req, res) => {
  try {
    const {
      type,
      employeeId,
      customerId,
      abuseType,
      details,
      severity,
      message,
      violationCount,
      timeWindow,
      requiresAction = true,
      requiresImmediateAction = false
    } = req.body;

    // Validate required fields
    if (!type || !employeeId || !severity || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const alert = new AbuseAlert({
      type,
      employeeId,
      customerId,
      abuseType,
      details,
      severity,
      message,
      violationCount,
      timeWindow,
      requiresAction,
      requiresImmediateAction
    });

    await alert.save();

    console.log(`✅ [ABUSE ALERT] New alert created: ${alert._id} for employee ${employeeId}`);

    res.status(201).json({
      message: 'Abuse alert created successfully',
      alert: {
        id: alert._id,
        type: alert.type,
        employeeId: alert.employeeId,
        severity: alert.severity,
        status: alert.status,
        createdAt: alert.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating abuse alert:', error);
    res.status(500).json({ error: 'Failed to create abuse alert' });
  }
});

// Get abuse alert statistics for dashboard
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!['superadmin', 'manager', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = await AbuseAlert.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          new: [{ $match: { status: 'new' } }, { $count: 'count' }],
          today: [{ $match: { createdAt: { $gte: oneDayAgo } } }, { $count: 'count' }],
          thisWeek: [{ $match: { createdAt: { $gte: oneWeekAgo } } }, { $count: 'count' }],
          bySeverity: [
            {
              $group: {
                _id: '$severity',
                count: { $sum: 1 }
              }
            }
          ],
          byType: [
            {
              $group: {
                _id: '$abuseType',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const result = {
      total: stats[0].total[0]?.count || 0,
      new: stats[0].new[0]?.count || 0,
      today: stats[0].today[0]?.count || 0,
      thisWeek: stats[0].thisWeek[0]?.count || 0,
      bySeverity: stats[0].bySeverity.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byType: stats[0].byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching abuse alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch abuse alert statistics' });
  }
});

module.exports = router;
