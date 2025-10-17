const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   GET /api/roles
// @desc    Get all roles and permissions
// @access  Private (Admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const roles = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: {
          admin: { create: true, read: true, update: true, delete: true },
          roles: { create: true, read: true, update: true, delete: true },
          employees: { create: true, read: true, update: true, delete: true },
          client: { create: true, read: true, update: true, delete: true },
          report: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        id: 'moderator',
        name: 'Moderator',
        description: 'Limited administrative access',
        permissions: {
          admin: { create: false, read: true, update: false, delete: false },
          roles: { create: false, read: true, update: false, delete: false },
          employees: { create: true, read: true, update: true, delete: false },
          client: { create: true, read: true, update: true, delete: false },
          report: { create: false, read: true, update: false, delete: false }
        }
      },
      {
        id: 'user',
        name: 'User',
        description: 'Basic user access',
        permissions: {
          admin: { create: false, read: false, update: false, delete: false },
          roles: { create: false, read: false, update: false, delete: false },
          employees: { create: false, read: true, update: false, delete: false },
          client: { create: true, read: true, update: true, delete: false },
          report: { create: false, read: false, update: false, delete: false }
        }
      }
    ];

    res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/roles
// @desc    Create a new role
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { name, description, permissions } = req.body;

    // Validate required fields
    if (!name || !permissions) {
      return res.status(400).json({ message: 'Role name and permissions are required' });
    }

    // Create new role (in a real app, you'd save this to database)
    const newRole = {
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
      description: description || '',
      permissions
    };

    res.status(201).json({ 
      success: true, 
      message: 'Role created successfully',
      role: newRole 
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/roles/:id
// @desc    Update a role
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const { name, description, permissions } = req.body;
    const roleId = req.params.id;

    // Update role (in a real app, you'd update in database)
    const updatedRole = {
      id: roleId,
      name: name || 'Updated Role',
      description: description || '',
      permissions: permissions || {}
    };

    res.json({ 
      success: true, 
      message: 'Role updated successfully',
      role: updatedRole 
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/roles/:id
// @desc    Delete a role
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    const roleId = req.params.id;

    // Check if role is being used by any users
    const usersWithRole = await User.find({ role: roleId });
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: `Cannot delete role. ${usersWithRole.length} user(s) are currently using this role.` 
      });
    }

    // Delete role (in a real app, you'd delete from database)
    res.json({ 
      success: true, 
      message: 'Role deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
