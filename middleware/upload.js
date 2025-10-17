const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Enhanced file upload middleware with security features
 * Provides comprehensive file validation and secure storage
 */

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories for better organization
const createUploadSubdirs = () => {
  const subdirs = ['images', 'temp', 'processed'];
  subdirs.forEach(subdir => {
    const subdirPath = path.join(uploadsDir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  });
};

createUploadSubdirs();

// Enhanced storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use images subdirectory for better organization
    const destPath = path.join(uploadsDir, 'images');
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    // Generate secure filename with hash
    const fileHash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const extension = path.extname(file.originalname).toLowerCase();
    
    // Create filename: hash-timestamp.extension
    const filename = `${fileHash}-${timestamp}${extension}`;
    
    // Log file upload for security
    logger.info('File upload initiated', {
      originalName: file.originalname,
      filename: filename,
      mimetype: file.mimetype,
      size: file.size,
      ip: req.ip,
      userId: req.user?.id
    });
    
    cb(null, filename);
  }
});

// Enhanced file filter with comprehensive validation
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp'
  ];
  
  // Allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  
  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    logger.security('File upload rejected: Invalid MIME type', {
      mimetype: file.mimetype,
      originalName: file.originalname,
      ip: req.ip,
      userId: req.user?.id
    });
    return cb(new Error(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
  }
  
  // Check file extension
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    logger.security('File upload rejected: Invalid file extension', {
      extension: extension,
      originalName: file.originalname,
      ip: req.ip,
      userId: req.user?.id
    });
    return cb(new Error(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`), false);
  }
  
  // Check file size (additional validation)
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB default
  if (file.size > maxSize) {
    logger.security('File upload rejected: File too large', {
      size: file.size,
      maxSize: maxSize,
      originalName: file.originalname,
      ip: req.ip,
      userId: req.user?.id
    });
    return cb(new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`), false);
  }
  
  // File is valid
  cb(null, true);
};

// Enhanced multer configuration
const createUploadMiddleware = (options = {}) => {
  const config = {
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
      files: parseInt(process.env.MAX_FILES) || 5, // Maximum 5 files
      fieldSize: 2 * 1024 * 1024 // 2MB for field data
    },
    ...options
  };
  
  return multer(config);
};

// Pre-configured upload middlewares for different use cases
const upload = createUploadMiddleware();

// Single file upload
const uploadSingle = createUploadMiddleware({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: 1
  }
});

// Multiple files upload with custom limit
const uploadMultiple = (maxFiles = 5) => createUploadMiddleware({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: maxFiles
  }
});

// Profile image upload (smaller size)
const uploadProfileImage = createUploadMiddleware({
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for profile images
    files: 1
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = error.message;
    }
    
    logger.error('Multer upload error', {
      code: error.code,
      message: error.message,
      ip: req.ip,
      userId: req.user?.id
    });
    
    return res.status(400).json({
      success: false,
      error: message
    });
  }
  
  if (error) {
    logger.error('File upload error', {
      message: error.message,
      ip: req.ip,
      userId: req.user?.id
    });
    
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  next();
};

// File cleanup utility
const cleanupTempFiles = (files) => {
  if (!files || !Array.isArray(files)) return;
  
  files.forEach(file => {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
        logger.debug('Temporary file cleaned up', { path: file.path });
      }
    } catch (error) {
      logger.error('Failed to cleanup temporary file', { path: file.path, error: error.message });
    }
  });
};

// File validation utility
const validateUploadedFiles = (files) => {
  if (!files || files.length === 0) {
    return { valid: false, error: 'No files uploaded' };
  }
  
  const maxFiles = parseInt(process.env.MAX_FILES) || 5;
  if (files.length > maxFiles) {
    return { valid: false, error: `Too many files. Maximum allowed: ${maxFiles}` };
  }
  
  return { valid: true };
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadProfileImage,
  handleUploadError,
  cleanupTempFiles,
  validateUploadedFiles
};
