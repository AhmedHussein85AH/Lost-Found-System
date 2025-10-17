# Lost & Found System - Setup Guide

## 🚀 Quick Start

This guide will help you set up the complete Lost & Found Management System on your local machine.

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **MongoDB** (v5 or higher)
- **Git** (for cloning the repository)

## 🛠️ Installation Steps

### 1. Clone and Setup

```bash
# Navigate to your project directory
cd Lost&Found-Sys

# (Windows) Use quick starter
start.bat

# (Manual) Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory (copy from `ENV_EXAMPLE.txt`):

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/lost-found-system

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Lost & Found System <noreply@lostfound.com>

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 3. MongoDB Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB locally
# Windows: Download from https://www.mongodb.com/try/download/community
# macOS: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Start MongoDB service
# Windows: MongoDB runs as a service
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update `MONGODB_URI` in your `.env` file

### 4. Email Setup (optional Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use this password in your `.env` file

## 🚀 Running the Application

### Development Mode

```bash
# Easiest (Windows): double-click start.bat
start.bat

# Or start manually
npm run dev

# Terminal 2: Start Frontend (in a new terminal)
cd client
npm start
```

### Production Mode

```bash
# Build the frontend
npm run build

# Start production server
npm start
```

## 🌐 Access Points

- **Local App**: http://localhost:5000
- **GitHub Pages (demo mode)**: Enable Pages (root) to serve static UI
- **Backend API (when running server)**: http://localhost:5000

## 🔐 Default Admin Account

After first run, create an admin user:

```bash
# Using MongoDB shell
mongosh
use lost-found-system
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
```

## 📁 Project Structure

```
Lost&Found-Sys/
├── server.js                 # Main server file
├── package.json             # Backend dependencies
├── .env                     # Environment variables
├── models/                  # Database models
│   ├── User.js
│   └── Item.js
├── routes/                  # API routes
│   ├── auth.js
│   ├── items.js
│   ├── users.js
│   ├── admin.js
│   └── notifications.js
├── middleware/              # Custom middleware
│   ├── auth.js
│   └── upload.js
├── utils/                   # Utility functions
│   └── email.js
├── uploads/                 # File uploads directory
├── client/                  # React frontend
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       └── App.js
└── README.md
```

## 🧪 Testing the System

### 1. Create a Test User
- Go to http://localhost:3000/register
- Fill out the registration form
- Verify account creation

### 2. Test Item Reporting
- Login to your account
- Go to "Report Item"
- Try reporting both lost and found items
- Upload test images

### 3. Test Search Functionality
- Go to the search page
- Try different search terms
- Test filters and categories

### 4. Test Admin Features (if admin)
- Access admin dashboard
- View system statistics
- Manage users and items

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check if MongoDB is running
# Windows: Check Services app
# macOS/Linux: sudo systemctl status mongod
```

#### 2. Port Already in Use
```bash
# Kill process using port 5000
# Windows: netstat -ano | findstr :5000
# macOS/Linux: lsof -ti:5000 | xargs kill -9
```

#### 3. Email Not Sending
- Verify Gmail app password
- Check if 2FA is enabled
- Verify email credentials in `.env`

#### 4. File Upload Issues
```bash
# Ensure uploads directory exists
mkdir uploads
# Check file permissions
chmod 755 uploads
```

### Performance Issues

#### 1. Slow Database Queries
- Add database indexes
- Use pagination for large datasets
- Implement caching

#### 2. Large File Uploads
- Adjust `MAX_FILE_SIZE` in `.env`
- Implement file compression
- Use CDN for file storage

## 🚀 Deployment

### Heroku Deployment
```bash
# Install Heroku CLI
# Create new app
heroku create your-lost-found-app

# Set environment variables
heroku config:set MONGODB_URI=your-mongodb-atlas-uri
heroku config:set JWT_SECRET=your-secret-key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### Docker Deployment
```dockerfile
# Create Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 Monitoring & Maintenance

### 1. Database Maintenance
- Regular backups
- Index optimization
- Data cleanup for expired items

### 2. System Monitoring
- Monitor API response times
- Track user activity
- Monitor file storage usage

### 3. Security Updates
- Regular dependency updates
- Security patches
- SSL certificate renewal

## 🆘 Support

If you encounter issues:

1. Check the console logs
2. Verify environment variables
3. Check database connectivity
4. Review API endpoints
5. Check file permissions

## 📝 License

This project is developed by Ahmed Hussein, Security Coordinator.

---

**Happy Use! 🚀**

For more information, check the main README.md file.
