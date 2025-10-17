const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import custom middleware and utilities
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

const app = express();

// Environment configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lost-found-system';

// Database connection helper
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true
    });
    logger.info('✅ MongoDB connected successfully');
  } catch (err) {
    logger.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// Middleware setup with adjusted CSP to allow inline handlers in legacy HTML
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'", 'https:'],
        "script-src-elem": ["'self'", "'unsafe-inline'", 'https:'],
        // Allow inline event handler attributes temporarily
        "script-src-attr": ["'unsafe-inline'"],
        // Allow external connections (e.g., source maps/CDNs)
        "connect-src": ["'self'", 'https:'],
        // Common allowances for images used by the UI
        "img-src": ["'self'", 'data:', 'blob:']
      }
    }
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // allow normal browsing and background polling
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // Allow health checks, ping, and static HTML without limits
    if (req.path === '/ping' || req.path === '/health' || req.path === '/' || req.path.startsWith('/favicon') || req.path === '/error') {
      return true;
    }
    return false;
  }
});
app.use(generalLimiter);

// Stricter limiter for auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Import route modules
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const adminRoutes = require('./routes/admin');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');

// Mount API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/roles', require('./routes/roles'));
app.use('/api/simple-admin', require('./routes/simple-admin'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Simple connectivity check
app.get('/ping', (req, res) => {
  res.json({ status: 'connected' });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'enhanced_lost_found_app.html'));
});

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Silence Chrome DevTools discovery request
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Minimal error intake endpoint for in-page reporter
app.post('/error', express.json({ limit: '200kb' }), (req, res) => {
  try {
    const { message, stack, url, userAgent } = req.body || {};
    logger.warn('Browser error report', { message, url, userAgent });
  } catch (e) {
    // swallow
  }
  res.status(204).end();
});

// Enhanced static files serving with security headers
app.use('/uploads', (req, res, next) => {
  // Security headers for uploaded files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('X-Content-Type-Options', 'nosniff');
  
  // Log file access
  logger.info(`File access: ${req.path} by ${req.ip}`);
  next();
}, express.static('uploads'));

// Enhanced 404 handler
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Enhanced error handling middleware
app.use(errorHandler);

// Start server with enhanced logging
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info('Lost & Found System by Ahmed Hussein, Security Coordinator');
      logger.info('Happy Use! 🚀');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
