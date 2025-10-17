const fs = require('fs');
const path = require('path');

/**
 * Enhanced logging utility with file and console output
 * Supports different log levels and structured logging
 */
class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
    
    // Define log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL || 'info';
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(data && { data })
    };

    return JSON.stringify(logEntry);
  }

  writeToFile(level, formattedMessage) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logDir, `${date}-${level}.log`);
    
    try {
      fs.appendFileSync(logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.currentLevel];
  }

  log(level, message, data = null) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`);
    
    // File logging for error and warn levels
    if (['error', 'warn'].includes(level)) {
      this.writeToFile(level, formattedMessage);
    }
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Special logging methods
  request(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP Request', logData);
    } else {
      this.info('HTTP Request', logData);
    }
  }

  security(event, details) {
    this.warn(`Security Event: ${event}`, details);
  }

  database(operation, details) {
    this.debug(`Database ${operation}`, details);
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = {
  logger
};
