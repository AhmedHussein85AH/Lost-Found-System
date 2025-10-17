const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Item = require('../models/Item');
const { auth, admin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (admin only)
router.get('/dashboard', auth, admin, async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalItems = await Item.countDocuments();
    const lostItems = await Item.countDocuments({ type: 'lost' });
    const foundItems = await Item.countDocuments({ type: 'found' });
    const matchedItems = await Item.countDocuments({ status: 'matched' });
    const claimedItems = await Item.countDocuments({ status: 'claimed' });

    // Get recent activity
    const recentItems = await Item.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('reporter', 'username firstName lastName');

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('-password');

    // Get category distribution
    const categoryStats = await Item.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get monthly trends
    const monthlyStats = await Item.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalItems,
        lostItems,
        foundItems,
        matchedItems,
        claimedItems,
        activeItems: totalItems - claimedItems
      },
      recentActivity: {
        items: recentItems,
        users: recentUsers
      },
      categoryStats,
      monthlyStats
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error getting dashboard data' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (admin only)
router.get('/users', auth, admin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().trim(),
  query('role').optional().isIn(['user', 'admin', 'moderator']),
  query('status').optional().isIn(['active', 'inactive'])
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status
    } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        usersPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error getting users' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (admin only)
// @access  Private (admin only)
router.put('/users/:id', auth, admin, [
  body('role').optional().isIn(['user', 'admin', 'moderator']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role, isActive } = req.body;
    const updateFields = {};

    if (role !== undefined) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (admin only)
// @access  Private (admin only)
router.delete('/users/:id', auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is trying to delete themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Delete user's items
    await Item.deleteMany({ reporter: user._id });

    // Delete user
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User and associated items deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// @route   GET /api/admin/items
// @desc    Get all items with admin controls
// @access  Private (admin only)
router.get('/items', auth, admin, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['lost', 'found']),
  query('status').optional().isIn(['active', 'matched', 'claimed', 'closed', 'expired']),
  query('category').optional().isIn(['electronics', 'clothing', 'jewelry', 'documents', 'books', 'bags', 'keys', 'pets', 'other'])
], async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      category
    } = req.query;

    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (category) filter.category = category;

    const skip = (page - 1) * limit;

    const items = await Item.find(filter)
      .populate('reporter', 'username firstName lastName email')
      .populate('matchedWith')
      .populate('claimedBy', 'username firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Item.countDocuments(filter);

    res.json({
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get admin items error:', error);
    res.status(500).json({ message: 'Server error getting items' });
  }
});

// @route   PUT /api/admin/items/:id
// @desc    Update item status (admin only)
// @access  Private (admin only)
router.put('/items/:id', auth, admin, [
  body('status').isIn(['active', 'matched', 'claimed', 'closed', 'expired'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status } = req.body;

    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('reporter', 'username firstName lastName');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({
      message: 'Item status updated successfully',
      item
    });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ message: 'Server error updating item status' });
  }
});

// @route   DELETE /api/admin/items/:id
// @desc    Delete item (admin only)
// @access  Private (admin only)
router.delete('/items/:id', auth, admin, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Remove from user's items
    if (item.type === 'lost') {
      await User.findByIdAndUpdate(item.reporter, {
        $pull: { itemsReported: item._id }
      });
    } else {
      await User.findByIdAndUpdate(item.reporter, {
        $pull: { itemsFound: item._id }
      });
    }

    await Item.findByIdAndDelete(item._id);

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error deleting item' });
  }
});

// @route   POST /api/admin/items/bulk-action
// @desc    Perform bulk actions on items
// @access  Private (admin only)
router.post('/items/bulk-action', auth, admin, [
  body('itemIds').isArray({ min: 1 }),
  body('action').isIn(['delete', 'change-status', 'match'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemIds, action, status } = req.body;

    switch (action) {
      case 'delete':
        await Item.deleteMany({ _id: { $in: itemIds } });
        break;
      case 'change-status':
        if (!status) {
          return res.status(400).json({ message: 'Status is required for change-status action' });
        }
        await Item.updateMany(
          { _id: { $in: itemIds } },
          { $set: { status } }
        );
        break;
    }

    res.json({ message: `Bulk action '${action}' completed successfully` });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ message: 'Server error performing bulk action' });
  }
});

module.exports = router;
