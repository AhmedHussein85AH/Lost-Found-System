const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('itemsReported')
      .populate('itemsFound');

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error getting profile' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', auth, [
  body('firstName').optional().trim().escape(),
  body('lastName').optional().trim().escape(),
  body('phone').optional().trim().escape(),
  body('profileImage').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, phone, profileImage } = req.body;
    const updateFields = {};

    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (phone) updateFields.phone = phone;
    if (profileImage) updateFields.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @route   GET /api/users/my-items
// @desc    Get current user's items
// @access  Private
router.get('/my-items', auth, [
  query('type').optional().isIn(['lost', 'found']),
  query('status').optional().isIn(['active', 'matched', 'claimed', 'closed', 'expired']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const {
      type,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { reporter: req.user.id };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const items = await Item.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Item.countDocuments(filter);

    res.json({
      success: true,
      items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get my items error:', error);
    res.status(500).json({ success: false, message: 'Server error getting items' });
  }
});

// @route   GET /api/users/my-items/stats
// @desc    Get current user's item statistics
// @access  Private
router.get('/my-items/stats', auth, async (req, res) => {
  try {
    const stats = await Item.aggregate([
      { $match: { reporter: req.user.id } },
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Process stats into a more readable format
    const processedStats = {
      lost: { active: 0, matched: 0, claimed: 0, closed: 0, expired: 0 },
      found: { active: 0, matched: 0, claimed: 0, closed: 0, expired: 0 }
    };

    stats.forEach(stat => {
      const { type, status } = stat._id;
      processedStats[type][status] = stat.count;
    });

    res.json(processedStats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error getting statistics' });
  }
});

// @route   GET /api/users/search
// @desc    Search users (public search)
// @access  Public
router.get('/search', [
  query('q').notEmpty().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    const filter = {
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } }
      ],
      isActive: true
    };

    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('username firstName lastName profileImage')
      .sort({ username: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        usersPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// @route   GET /api/users/:id/public
// @desc    Get public user profile
// @access  Public
router.get('/:id/public', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username firstName lastName profileImage createdAt')
      .populate({
        path: 'itemsReported',
        match: { status: 'active' },
        select: 'title category type createdAt',
        options: { limit: 5 }
      })
      .populate({
        path: 'itemsFound',
        match: { status: 'active' },
        select: 'title category type createdAt',
        options: { limit: 5 }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Server error getting public profile' });
  }
});

module.exports = router;
