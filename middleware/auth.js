const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../utils/logger');

/**
 * Enhanced authentication middleware
 * Provides comprehensive token validation and user verification
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      logger.security('Authentication failed: No authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    // Check token format
    if (!authHeader.startsWith('Bearer ')) {
      logger.security('Authentication failed: Invalid token format', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      logger.security('Authentication failed: Empty token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      logger.security('Authentication failed: Invalid JWT token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        error: jwtError.message
      });
      return res.status(401).json({ 
        success: false,
        message: 'Token is not valid' 
      });
    }
    
    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      logger.security('Authentication failed: User not found', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        userId: decoded.userId
      });
      return res.status(401).json({ 
        success: false,
        message: 'Token is not valid' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      logger.security('Authentication failed: Inactive account', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        userId: user._id,
        username: user.username
      });
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Update last login time (only once per hour to avoid spam)
    const now = new Date();
    const lastLogin = user.lastLogin || new Date(0);
    const hoursSinceLastLogin = (now - lastLogin) / (1000 * 60 * 60);
    
    if (hoursSinceLastLogin >= 1) {
      user.lastLogin = now;
      await user.save();
    }

    // Add user to request object
    req.user = user;
    
    // Log successful authentication
    logger.info('User authenticated successfully', {
      userId: user._id,
      username: user.username,
      role: user.role,
      ip: req.ip,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('Auth middleware error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(500).json({ 
      success: false,
      message: 'Authentication error' 
    });
  }
};

/**
 * Enhanced admin role verification middleware
 * Checks if user has admin privileges
 */
const admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    logger.security('Admin access denied', {
      userId: req.user._id,
      username: req.user.username,
      role: req.user.role,
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin role required.' 
    });
  }
  
  next();
};

/**
 * Enhanced admin or moderator role verification middleware
 * Checks if user has admin or moderator privileges
 */
const adminOrModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required' 
    });
  }

  if (!['admin', 'moderator'].includes(req.user.role)) {
    logger.security('Admin/Moderator access denied', {
      userId: req.user._id,
      username: req.user.username,
      role: req.user.role,
      ip: req.ip,
      path: req.path
    });
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin or moderator role required.' 
    });
  }
  
  next();
};

/**
 * Optional authentication middleware
 * Adds user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
        logger.debug('Optional auth failed, continuing without user', {
          error: error.message,
          ip: req.ip,
          path: req.path
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next(); // Continue without user
  }
};

/**
 * Rate limiting for authentication endpoints
 */
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Authentication rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 15 * 60
    });
  }
};

module.exports = {
  auth,
  admin,
  adminOrModerator,
  optionalAuth,
  authRateLimit
};
