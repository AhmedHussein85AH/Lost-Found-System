# 🎯 Lost & Found Management System

A comprehensive web-based Lost & Found Management System built with Node.js, Express, MongoDB, and modern web technologies. This system provides a complete solution for managing lost and found items in any organization or community.
<img width="944" height="409" alt="image" src="https://github.com/user-attachments/assets/ddd0653e-4567-4756-9474-593999c185e1" />

## 🌟 **Live Demo**
🚀 **[Try it now!](https://ahmedhussein85ah.github.io/Lost-Found-System/)** - Experience the LEGENDARY interface
## ✨ Features

### 🔐 User Management
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Role-Based Access Control**: User, Moderator, and Admin roles
- **Profile Management**: User profiles with customizable settings
- **Session Management**: Secure session handling with automatic logout

### 📦 Item Management
- **Report Items**: Report lost or found items with detailed information
- **Image Upload**: Multiple image uploads with validation and optimization
- **Categorization**: Organized item categories (electronics, clothing, jewelry, etc.)
- **Status Tracking**: Real-time status updates (active, matched, claimed, delivered, closed)
- **Search & Filter**: Advanced search with multiple filters and sorting options

### 🤖 AI-Powered Features
- **Smart Matching**: AI-powered matching between lost and found items
- **Similarity Scoring**: Intelligent similarity algorithms
- **Automated Suggestions**: Automated match recommendations
- **Manual Override**: Admin control over AI suggestions

### 📊 Administrative Tools
- **Dashboard Analytics**: Comprehensive system statistics and reports
- **User Management**: Admin tools for user management and role assignment
- **Content Moderation**: Item approval and moderation system
- **Export Functionality**: Data export in multiple formats (Excel, PDF, CSV)

### 🔒 Security Features
- **Input Validation**: Comprehensive input validation and sanitization
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **CORS Configuration**: Secure cross-origin resource sharing
- **Security Headers**: Helmet.js for enhanced security
- **File Upload Security**: Secure file handling with validation

### 📱 Modern UI/UX
- **Responsive Design**: Works on all devices and screen sizes
- **Real-time Updates**: Live updates without page refresh
- **Intuitive Interface**: User-friendly design with clear navigation
- **Accessibility**: WCAG compliant accessibility features

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **MongoDB** (v4.4 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Lost&Found-Sys
   ```

2. **Environment setup**
   - Copy `ENV_EXAMPLE.txt` to `.env` and adjust values

3. **Start (Windows)**
   - Double-click `start.bat` (auto-installs deps, starts server)

4. **Start (manual/other OS)**
   ```bash
   npm install
   npm run dev
   ```

3. **Environment Configuration**
   ```bash
   # Copy the example environment file
   cp config.env.example .env
   
   # Edit the .env file with your configuration
   nano .env
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

5. **Access the app**
   - UI: `http://localhost:5000/`
   - Health: `http://localhost:5000/health`

### View on GitHub Pages (Frontend-Only)

- Push the repo and enable GitHub Pages (root). The static app loads with demo mode.
- Demo login (any password works in demo mode):
  - `admin@example.com`
  - `test@example.com`
- Note: Backend actions (real DB, uploads, emails) require running the server.

6. **Access the application**
   - Open your browser and go to `http://localhost:5000`
   - Health check: `http://localhost:5000/health`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory (see `ENV_EXAMPLE.txt`) with variables like:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
BODY_LIMIT=10mb

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/lost-found-system

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration (for production)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000

# File Upload Configuration
MAX_FILE_SIZE=5242880
MAX_FILES=5
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@lostfound.com

# Logging Configuration
LOG_LEVEL=info

# AI/ML Configuration (for matching)
AI_ENABLED=true
MATCHING_THRESHOLD=0.7

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📁 Project Structure

```
Lost&Found-Sys/
├── 📁 middleware/          # Express middleware
│   ├── auth.js            # Authentication middleware
│   ├── errorHandler.js    # Error handling middleware
│   └── upload.js          # File upload middleware
├── 📁 models/             # MongoDB models
│   ├── User.js           # User model
│   └── Item.js           # Item model
├── 📁 routes/             # API routes
│   ├── auth.js           # Authentication routes
│   ├── items.js          # Item management routes
│   ├── users.js          # User management routes
│   ├── admin.js          # Admin routes
│   ├── notifications.js  # Notification routes
│   └── ai.js             # AI matching routes
├── 📁 utils/              # Utility functions
│   ├── logger.js         # Logging utility
│   └── validation.js     # Validation utilities
├── 📁 uploads/            # File uploads directory
├── 📁 logs/               # Application logs
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── config.env.example     # Environment configuration example
├── start.bat              # Windows quick starter
├── ENV_EXAMPLE.txt        # Sample environment variables
└── README.md              # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Items
- `GET /api/items` - Get all items (with filters)
- `POST /api/items` - Create new item
- `GET /api/items/:id` - Get specific item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id` - Update user role
- `GET /api/admin/reports` - Generate reports

### AI Matching
- `POST /api/ai/match` - Find matches for item
- `GET /api/ai/suggestions` - Get AI suggestions

## 🛠️ Development

### Available Scripts

```bash
# Start development server with nodemon
npm run dev

# Start production server
npm start

# Seed default users (admin and test)
npm run seed

# Install client dependencies
npm run install-client

# Build client application
npm run build

# Install all dependencies
npm run install-all
```

### Test Credentials (after seeding, full backend)

- Admin: `admin@example.com` / `Admin@12345`
- User: `test@example.com` / `Test@12345`

### Code Quality

The project follows these coding standards:
- **ESLint** for code linting
- **Prettier** for code formatting
- **JSDoc** for documentation
- **Consistent naming conventions**
- **Error handling best practices**

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "auth"
```

## 🔒 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control
- Password hashing with bcrypt
- Session management
- Rate limiting for auth endpoints

### Input Validation
- Comprehensive input validation
- SQL injection prevention
- XSS protection
- File upload validation
- Data sanitization

### Security Headers
- Helmet.js for security headers
- CORS configuration
- Content Security Policy
- XSS Protection
- Frame Options

## 📊 Monitoring & Logging

### Logging Levels
- **ERROR**: Critical errors and exceptions
- **WARN**: Warning messages and security events
- **INFO**: General information and requests
- **DEBUG**: Detailed debugging information

### Log Files
- Daily log rotation
- Separate files for different log levels
- Structured JSON logging
- Request/response logging

### Health Monitoring
- Health check endpoint (`/health`)
- Database connection monitoring
- System uptime tracking
- Performance metrics

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-secret
   ```

2. **Security Considerations**
   - Use strong JWT secrets
   - Configure CORS properly
   - Set up SSL/TLS
   - Use environment variables
   - Regular security updates

3. **Performance Optimization**
   - Enable compression
   - Use CDN for static files
   - Database indexing
   - Caching strategies

### One‑click Hosting Options

- Render, Railway, or Heroku with MongoDB Atlas. Set env vars from `.env`.

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style Guidelines
- Follow existing code style
- Add comments for complex logic
- Write meaningful commit messages
- Include tests for new features
- Update documentation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Ahmed Hussein** - Security Coordinator
- LinkedIn: www.linkedin.com/in/ahmed-h-6331a0289
- GitHub: https://github.com/AhmedHussein85AH

## 🙏 Acknowledgments

- Express.js team for the excellent framework
- MongoDB team for the database
- All contributors and testers
- The open-source community

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@lostfound.com
- Documentation: [docs-url]

---

**Happy Use! 🚀**

*Lost & Found System by Ahmed Hussein, Security Coordinator*


