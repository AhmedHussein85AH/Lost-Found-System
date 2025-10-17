const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Item = require('../models/Item');
const User = require('../models/User');
const { auth, adminOrModerator } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/items
// @desc    Create a new lost or found item
// @access  Private
router.post('/', auth, upload.array('images', 5), [
  body('type').isIn(['lost', 'found']),
  body('title').isLength({ min: 1, max: 100 }).trim().escape(),
  body('description').isLength({ min: 1, max: 1000 }).trim().escape(),
  body('category').isIn(['electronics', 'clothing', 'jewelry', 'documents', 'books', 'bags', 'keys', 'pets', 'other']),
  body('location').notEmpty().trim().escape(), // Accept simple location string
  body('date').isISO8601(),
  body('tags').optional().isArray(),
  body('color').optional().trim().escape(),
  body('brand').optional().trim().escape(),
  body('model').optional().trim().escape(),
  body('serialNumber').optional().trim().escape(),
  body('estimatedValue').optional().isNumeric(),
  body('isUrgent').optional().isBoolean(),
  body('contactPreference').optional().isIn(['email', 'phone', 'both']),
  body('additionalNotes').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const itemData = {
      ...req.body,
      reporter: req.user.id,
      images: req.files ? req.files.map(file => file.filename) : []
    };

    // Handle simple location string - convert to backend format
    if (itemData.location && typeof itemData.location === 'string') {
      itemData.location = {
        address: itemData.location,
        coordinates: [0, 0] // Default coordinates
      };
    }

    const item = new Item(itemData);
    await item.save();

    // Update user's items
    if (item.type === 'lost') {
      await User.findByIdAndUpdate(req.user.id, {
        $push: { itemsReported: item._id }
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $push: { itemsFound: item._id }
      });
    }

    const populatedItem = await Item.findById(item._id).populate('reporter', 'username firstName lastName email');

    res.status(201).json({
      message: `${item.type} item created successfully`,
      item: populatedItem
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error creating item' });
  }
});

// @route   GET /api/items
// @desc    Get all items with filtering and search
// @access  Public
router.get('/', [
  query('type').optional().isIn(['lost', 'found']),
  query('category').optional().isIn(['electronics', 'clothing', 'jewelry', 'documents', 'books', 'bags', 'keys', 'pets', 'other']),
  query('status').optional().isIn(['active', 'matched', 'claimed', 'closed', 'expired']),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sortBy').optional().isIn(['date', 'title', 'category', 'status']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const {
      type,
      category,
      status,
      search,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (page - 1) * limit;

    const items = await Item.find(filter)
      .populate('reporter', 'username firstName lastName')
      .sort(sort)
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
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error getting items' });
  }
});

// @route   GET /api/items/search
// @desc    Search for items
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, search, category, subcategory, type, color, priority } = req.query;
    const query = {};

    // Handle both 'q' and 'search' parameters
    const searchTerm = q || search;
    
    console.log('🔍 Search request received:', req.query);
    console.log('🔍 Search term:', searchTerm);

    // Add search term filter
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { brand: { $regex: searchTerm, $options: 'i' } },
        { color: { $regex: searchTerm, $options: 'i' } },
        { model: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Add subcategory filter
    if (subcategory && subcategory !== 'all') {
      query.subcategory = subcategory;
    }

    // Add type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // Add color filter
    if (color) {
      query.color = { $regex: color, $options: 'i' };
    }

    // Add priority filter
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    const items = await Item.find(query)
      .populate('reporter', 'username')
      .sort({ createdAt: -1 })
      .limit(50);

    console.log('🔍 Search query:', req.query);
    console.log('🔍 MongoDB query:', query);
    console.log('🔍 Found items:', items.length);

    res.json({ success: true, items });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// @route   GET /api/items/:id
// @desc    Get item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('reporter', 'username firstName lastName email phone')
      .populate('matchedWith')
      .populate('claimedBy', 'username firstName lastName');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    res.json({ success: true, item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ success: false, message: 'Server error getting item' });
  }
});

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (owner or admin)
router.put('/:id', auth, upload.array('images', 5), async (req, res) => {
  try {
    console.log('🔄 Update request received for item:', req.params.id);
    console.log('📋 Request body:', req.body);
    console.log('📁 Request files:', req.files);
    console.log('👤 User making request:', req.user?.id, req.user?.username);
    console.log('🔍 Request headers:', req.headers);
    
    // Validate item ID format
    if (!req.params.id || !req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid item ID format' });
    }
    
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      console.log('❌ Item not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Item not found' });
    }
    
    console.log('✅ Item found:', item.title, 'by reporter:', item.reporter);

    // Check if user can edit this item
    console.log('🔐 Authorization check:');
    console.log('  Item reporter:', item.reporter || 'undefined');
    console.log('  User ID:', req.user.id);
    console.log('  User role:', req.user.role);
    console.log('  Is admin:', req.user.role === 'admin');
    
    // Handle undefined reporter safely
    const reporterId = item.reporter ? item.reporter.toString() : null;
    console.log('  Is owner:', reporterId === req.user.id);
    
    // If reporter is undefined, assign current user as reporter
    if (!item.reporter) {
      item.reporter = req.user.id;
      await item.save();
      console.log('✅ Assigned current user as reporter for orphaned item');
    } else if (reporterId !== req.user.id && req.user.role !== 'admin') {
      console.log('❌ Authorization failed');
      return res.status(403).json({ message: 'Not authorized to edit this item' });
    }
    
    console.log('✅ Authorization passed');

    const updateData = { ...req.body };
    
    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.reporter;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    // Handle image updates
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(file => file.filename);
    }

    // Convert coordinates to numbers if present
    if (updateData.location && updateData.location.coordinates) {
      updateData.location.coordinates = updateData.location.coordinates.map(coord => Number(coord));
    }
    
    // Validate required fields if they're being updated
    if (updateData.type && !['lost', 'found'].includes(updateData.type)) {
      return res.status(400).json({ message: 'Invalid item type' });
    }
    
    if (updateData.category && !['electronics', 'clothing', 'jewelry', 'documents', 'books', 'bags', 'keys', 'pets', 'other'].includes(updateData.category)) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    
    if (updateData.status && !['active', 'matched', 'claimed', 'delivered', 'closed', 'expired'].includes(updateData.status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    console.log('📋 Processed update data:', updateData);

    console.log('🔄 Attempting to update item in database...');
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('reporter', 'username firstName lastName');
    
    console.log('✅ Item updated successfully:', updatedItem ? 'Yes' : 'No');
    if (updatedItem) {
      console.log('📝 Updated item title:', updatedItem.title);
    }

    res.json({
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('❌ Update item error:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request body:', req.body);
    console.error('❌ Request files:', req.files);
    console.error('❌ Item ID:', req.params.id);
    console.error('❌ User ID:', req.user?.id);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid item ID format' 
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Duplicate field value' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error updating item: ' + error.message,
      errorType: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete item
// @access  Private (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user can delete this item
    if (item.reporter.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    await Item.findByIdAndDelete(req.params.id);

    // Remove from user's items
    if (item.type === 'lost') {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { itemsReported: item._id }
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { itemsFound: item._id }
      });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error deleting item' });
  }
});

// @route   POST /api/items/:id/match
// @desc    Match a lost item with a found item
// @access  Private (admin or moderator)
router.post('/:id/match', auth, adminOrModerator, [
  body('matchedItemId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { matchedItemId } = req.body;
    const item = await Item.findById(req.params.id);
    const matchedItem = await Item.findById(matchedItemId);

    if (!item || !matchedItem) {
      return res.status(404).json({ message: 'One or both items not found' });
    }

    // Check if items can be matched
    if (item.type === matchedItem.type) {
      return res.status(400).json({ message: 'Cannot match items of the same type' });
    }

    if (item.status !== 'active' || matchedItem.status !== 'active') {
      return res.status(400).json({ message: 'Both items must be active for matching' });
    }

    // Update both items
    item.status = 'matched';
    item.matchedWith = matchedItemId;
    matchedItem.status = 'matched';
    matchedItem.matchedWith = item._id;

    await Promise.all([item.save(), matchedItem.save()]);

    res.json({
      message: 'Items matched successfully',
      item,
      matchedItem
    });
  } catch (error) {
    console.error('Match items error:', error);
    res.status(500).json({ message: 'Server error matching items' });
  }
});

// @route   POST /api/items/:id/claim
// @desc    Claim a matched item
// @access  Private
router.post('/:id/claim', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!item.canBeClaimed()) {
      return res.status(400).json({ message: 'Item cannot be claimed' });
    }

    item.status = 'claimed';
    item.claimedBy = req.user.id;
    item.claimDate = Date.now();

    await item.save();

    res.json({
      message: 'Item claimed successfully',
      item
    });
  } catch (error) {
    console.error('Claim item error:', error);
    res.status(500).json({ message: 'Server error claiming item' });
  }
});

// @route   GET /api/items/search/suggestions
// @desc    Get search suggestions
// @access  Public
router.get('/search/suggestions', [
  query('q').notEmpty().trim()
], async (req, res) => {
  try {
    const { q } = req.query;
    
    const suggestions = await Item.aggregate([
      {
        $search: {
          autocomplete: {
            query: q,
            path: "title",
            fuzzy: { maxEdits: 1 }
          }
        }
      },
      { $limit: 10 },
      { $project: { title: 1, category: 1, type: 1 } }
    ]);

    res.json(suggestions);
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({ message: 'Server error getting suggestions' });
  }
});

module.exports = router;
