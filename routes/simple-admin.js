const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');

// Simple admin check middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
};

// Get admin dashboard data
router.get('/dashboard', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalItems = await Item.countDocuments();
    const pendingItems = await Item.countDocuments({ status: 'pending' });
    const resolvedItems = await Item.countDocuments({ status: 'resolved' });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalItems,
        pendingItems,
        resolvedItems
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'firstName lastName email role department createdAt').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new user (Admin only)
router.post('/users', auth, isAdmin, async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, phone, role, department } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'First name, last name, username, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      username,
      email,
      password,
      phone: phone || '',
      role: role || 'user',
      department: department || 'other'
    });

    await user.save();

    // Return user without password
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt
    };

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user role
router.put('/users/:id/role', auth, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User role updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user status (activate/deactivate)
router.put('/users/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: `User ${isActive ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all items
router.get('/items', auth, isAdmin, async (req, res) => {
  try {
    const items = await Item.find({}).populate('reportedBy', 'firstName lastName email').sort({ createdAt: -1 });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update item status
router.put('/items/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Item.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Item status updated', item });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete item
router.delete('/items/:id', auth, isAdmin, async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
