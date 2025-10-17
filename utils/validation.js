const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('./logger');

/**
 * Enhanced validation utilities for the Lost & Found System
 * Provides comprehensive input validation and sanitization
 */

// Common validation rules
const commonValidations = {
  // User validation rules
  username: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
      .escape()
  ],
  
  email: [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .trim()
  ],
  
  password: [
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  
  firstName: [
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
      .escape()
  ],
  
  lastName: [
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
      .escape()
  ],
  
  phone: [
    body('phone')
      .optional()
      .trim()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number')
      .escape()
  ],
  
  // Item validation rules
  itemTitle: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters')
      .escape()
  ],
  
  itemDescription: [
    body('description')
      .trim()
      .isLength({ min: 10, max: 1000 })
      .withMessage('Description must be between 10 and 1000 characters')
      .escape()
  ],
  
  itemCategory: [
    body('category')
      .isIn(['electronics', 'clothing', 'jewelry', 'documents', 'books', 'sports', 'other'])
      .withMessage('Please select a valid category')
  ],
  
  itemLocation: [
    body('location')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Location must be between 3 and 200 characters')
      .escape()
  ],
  
  itemDate: [
    body('date')
      .isISO8601()
      .withMessage('Please provide a valid date')
      .custom((value) => {
        const date = new Date(value);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        
        if (date > now) {
          throw new Error('Date cannot be in the future');
        }
        
        if (date < oneYearAgo) {
          throw new Error('Date cannot be more than one year ago');
        }
        
        return true;
      })
  ],
  
  // Search validation rules
  searchQuery: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .escape()
  ],
  
  searchCategory: [
    query('category')
      .optional()
      .isIn(['electronics', 'clothing', 'jewelry', 'documents', 'books', 'sports', 'other', 'all'])
      .withMessage('Please select a valid category')
  ],
  
  searchStatus: [
    query('status')
      .optional()
      .isIn(['active', 'matched', 'claimed', 'delivered', 'closed', 'all'])
      .withMessage('Please select a valid status')
  ],
  
  // Pagination validation rules
  page: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
  ],
  
  limit: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  
  // ID validation rules
  objectId: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ID format')
  ],
  
  // Date range validation
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date')
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate) {
          const start = new Date(req.query.startDate);
          const end = new Date(endDate);
          
          if (end < start) {
            throw new Error('End date cannot be before start date');
          }
        }
        return true;
      })
  ]
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Log validation errors
    logger.warn('Validation failed', {
      errors: errors.array(),
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Sanitization utilities
const sanitize = {
  // Remove HTML tags and dangerous characters
  html: (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '');
  },
  
  // Sanitize email
  email: (email) => {
    if (typeof email !== 'string') return email;
    return email.toLowerCase().trim();
  },
  
  // Sanitize phone number
  phone: (phone) => {
    if (typeof phone !== 'string') return phone;
    return phone.replace(/[^\d+]/g, '');
  },
  
  // Sanitize text input
  text: (text) => {
    if (typeof text !== 'string') return text;
    return text.trim().replace(/\s+/g, ' ');
  },
  
  // Sanitize object (recursive)
  object: (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitize.text(value);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = sanitize.object(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitize.text(item) : item
        );
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
};

// Custom validation functions
const customValidations = {
  // Check if user exists
  userExists: async (userId) => {
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return true;
  },
  
  // Check if item exists
  itemExists: async (itemId) => {
    const Item = require('../models/Item');
    const item = await Item.findById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }
    return true;
  },
  
  // Validate file upload
  validateFileUpload: (files, maxFiles = 5, maxSize = 5 * 1024 * 1024) => {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }
    
    if (files.length > maxFiles) {
      throw new Error(`Too many files. Maximum allowed: ${maxFiles}`);
    }
    
    for (const file of files) {
      if (file.size > maxSize) {
        throw new Error(`File ${file.originalname} is too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
      }
    }
    
    return true;
  },
  
  // Validate date range
  validateDateRange: (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (start > now || end > now) {
      throw new Error('Dates cannot be in the future');
    }
    
    if (end < start) {
      throw new Error('End date cannot be before start date');
    }
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 365) {
      throw new Error('Date range cannot exceed one year');
    }
    
    return true;
  }
};

// Export validation utilities
module.exports = {
  commonValidations,
  validate,
  sanitize,
  customValidations
};
