const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['lost', 'found'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: [
      'electronics',
      'clothing',
      'jewelry',
      'documents',
      'books',
      'bags',
      'keys',
      'pets',
      'other'
    ]
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: false, // Make coordinates optional
      default: [0, 0] // Default coordinates
    },
    address: {
      type: String,
      required: true
    },
    building: String,
    floor: String,
    room: String
  },
  date: {
    type: Date,
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['active', 'matched', 'claimed', 'delivered', 'closed', 'expired'],
    default: 'active'
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  claimDate: Date,
  tags: [String],
  color: String,
  brand: String,
  model: String,
  serialNumber: String,
  estimatedValue: {
    type: Number,
    min: 0
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  contactPreference: {
    type: String,
    enum: ['email', 'phone', 'both'],
    default: 'email'
  },
  additionalNotes: String,
  expiryDate: {
    type: Date,
    default: function() {
      // Items expire after 90 days
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes for better search performance
itemSchema.index({ location: '2dsphere' });
itemSchema.index({ category: 1, type: 1, status: 1 });
itemSchema.index({ title: 'text', description: 'text', tags: 'text' });
itemSchema.index({ date: -1 });
itemSchema.index({ expiryDate: 1 });

// Virtual for days since reported
itemSchema.virtual('daysSinceReported').get(function() {
  return Math.floor((Date.now() - this.date) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
itemSchema.virtual('daysUntilExpiry').get(function() {
  return Math.floor((this.expiryDate - Date.now()) / (1000 * 60 * 60 * 24));
});

// Check if item is expired
itemSchema.methods.isExpired = function() {
  return Date.now() > this.expiryDate;
};

// Check if item can be claimed
itemSchema.methods.canBeClaimed = function() {
  return this.status === 'matched' && !this.claimedBy;
};

// Pre-save middleware to handle location conversion
itemSchema.pre('save', function(next) {
  // If location is a simple string, convert it to the expected structure
  if (this.location && typeof this.location === 'string') {
    this.location = {
      type: 'Point',
      coordinates: [0, 0],
      address: this.location
    };
  }
  next();
});

module.exports = mongoose.model('Item', itemSchema);
