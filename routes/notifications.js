const express = require('express');
const { body, validationResult } = require('express-validator');
const Item = require('../models/Item');
const User = require('../models/User');
const { auth, adminOrModerator } = require('../middleware/auth');
const sendEmail = require('../utils/email');

const router = express.Router();

// @route   POST /api/notifications/send
// @desc    Send notification to user
// @access  Private (admin or moderator)
router.post('/send', auth, adminOrModerator, [
  body('userId').isMongoId(),
  body('subject').notEmpty().trim().escape(),
  body('message').notEmpty().trim().escape(),
  body('type').isIn(['info', 'warning', 'success', 'error'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, subject, message, type } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send email notification
    await sendEmail({
      to: user.email,
      subject: `Lost & Found System: ${subject}`,
      html: `
        <h2>${subject}</h2>
        <p>Hello ${user.firstName},</p>
        <p>${message}</p>
        <p>Best regards,<br>Lost & Found System Team</p>
      `
    });

    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Server error sending notification' });
  }
});

// @route   POST /api/notifications/item-match
// @desc    Send notification when items are matched
// @access  Private
router.post('/item-match', auth, async (req, res) => {
  try {
    const { lostItemId, foundItemId } = req.body;

    const lostItem = await Item.findById(lostItemId).populate('reporter');
    const foundItem = await Item.findById(foundItemId).populate('reporter');

    if (!lostItem || !foundItem) {
      return res.status(404).json({ message: 'One or both items not found' });
    }

    // Send notification to lost item reporter
    if (lostItem.reporter.email) {
      await sendEmail({
        to: lostItem.reporter.email,
        subject: 'Great News! Your Lost Item May Have Been Found',
        html: `
          <h2>Potential Match Found!</h2>
          <p>Hello ${lostItem.reporter.firstName},</p>
          <p>We have found a potential match for your lost item: <strong>${lostItem.title}</strong></p>
          <p><strong>Found Item Details:</strong></p>
          <ul>
            <li>Title: ${foundItem.title}</li>
            <li>Category: ${foundItem.category}</li>
            <li>Location: ${foundItem.location.address}</li>
            <li>Date Found: ${new Date(foundItem.date).toLocaleDateString()}</li>
          </ul>
          <p>Please review the details and contact us if this matches your lost item.</p>
          <p>Best regards,<br>Lost & Found System Team</p>
        `
      });
    }

    // Send notification to found item reporter
    if (foundItem.reporter.email) {
      await sendEmail({
        to: foundItem.reporter.email,
        subject: 'Your Found Item May Have Been Claimed',
        html: `
          <h2>Potential Owner Found!</h2>
          <p>Hello ${foundItem.reporter.firstName},</p>
          <p>We have found a potential owner for your found item: <strong>${foundItem.title}</strong></p>
          <p><strong>Lost Item Details:</strong></p>
          <ul>
            <li>Title: ${lostItem.title}</li>
            <li>Category: ${lostItem.category}</li>
            <li>Location Lost: ${lostItem.location.address}</li>
            <li>Date Lost: ${new Date(lostItem.date).toLocaleDateString()}</li>
          </ul>
          <p>Please review the details and contact us if this matches the item you found.</p>
          <p>Best regards,<br>Lost & Found System Team</p>
        `
      });
    }

    res.json({ message: 'Match notifications sent successfully' });
  } catch (error) {
    console.error('Item match notification error:', error);
    res.status(500).json({ message: 'Server error sending match notifications' });
  }
});

// @route   POST /api/notifications/item-claimed
// @desc    Send notification when item is claimed
// @access  Private
router.post('/item-claimed', auth, async (req, res) => {
  try {
    const { itemId, claimedByUserId } = req.body;

    const item = await Item.findById(itemId).populate('reporter');
    const claimedByUser = await User.findById(claimedByUserId);

    if (!item || !claimedByUser) {
      return res.status(404).json({ message: 'Item or user not found' });
    }

    // Send notification to item reporter
    if (item.reporter.email) {
      await sendEmail({
        to: item.reporter.email,
        subject: 'Your Item Has Been Claimed',
        html: `
          <h2>Item Successfully Claimed!</h2>
          <p>Hello ${item.reporter.firstName},</p>
          <p>Your ${item.type} item: <strong>${item.title}</strong> has been successfully claimed.</p>
          <p><strong>Claimed By:</strong> ${claimedByUser.firstName} ${claimedByUser.lastName}</p>
          <p><strong>Claim Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p>Thank you for using our Lost & Found system!</p>
          <p>Best regards,<br>Lost & Found System Team</p>
        `
      });
    }

    // Send notification to person who claimed the item
    if (claimedByUser.email) {
      await sendEmail({
        to: claimedByUser.email,
        subject: 'Item Claim Confirmation',
        html: `
          <h2>Item Claim Confirmed!</h2>
          <p>Hello ${claimedByUser.firstName},</p>
          <p>You have successfully claimed the item: <strong>${item.title}</strong></p>
          <p><strong>Item Details:</strong></p>
          <ul>
            <li>Category: ${item.category}</li>
            <li>Location: ${item.location.address}</li>
            <li>Claim Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Please contact the item reporter to arrange pickup.</p>
          <p>Best regards,<br>Lost & Found System Team</p>
        `
      });
    }

    res.json({ message: 'Claim notifications sent successfully' });
  } catch (error) {
    console.error('Item claimed notification error:', error);
    res.status(500).json({ message: 'Server error sending claim notifications' });
  }
});

// @route   POST /api/notifications/bulk
// @desc    Send bulk notifications to multiple users
// @access  Private (admin only)
router.post('/bulk', auth, adminOrModerator, [
  body('userIds').isArray({ min: 1 }),
  body('subject').notEmpty().trim().escape(),
  body('message').notEmpty().trim().escape(),
  body('type').isIn(['info', 'warning', 'success', 'error'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userIds, subject, message, type } = req.body;

    const users = await User.find({ _id: { $in: userIds } });
    
    // Send emails to all users
    const emailPromises = users.map(user => 
      sendEmail({
        to: user.email,
        subject: `Lost & Found System: ${subject}`,
        html: `
          <h2>${subject}</h2>
          <p>Hello ${user.firstName},</p>
          <p>${message}</p>
          <p>Best regards,<br>Lost & Found System Team</p>
        `
      })
    );

    await Promise.all(emailPromises);

    res.json({ 
      message: `Bulk notifications sent successfully to ${users.length} users` 
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({ message: 'Server error sending bulk notifications' });
  }
});

// @route   POST /api/notifications/welcome
// @desc    Send welcome notification to new user
// @access  Private
router.post('/welcome', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await sendEmail({
      to: user.email,
      subject: 'Welcome to the Lost & Found System',
      html: `
        <h2>Welcome to the Lost & Found System!</h2>
        <p>Hello ${user.firstName},</p>
        <p>Thank you for joining our Lost & Found community! We're here to help you find your lost items and return found items to their rightful owners.</p>
        <p><strong>Getting Started:</strong></p>
        <ul>
          <li>Report lost items with detailed descriptions and photos</li>
          <li>Report found items to help others</li>
          <li>Search through existing reports</li>
          <li>Get notified when potential matches are found</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Best regards,<br>Lost & Found System Team</p>
      `
    });

    res.json({ message: 'Welcome notification sent successfully' });
  } catch (error) {
    console.error('Welcome notification error:', error);
    res.status(500).json({ message: 'Server error sending welcome notification' });
  }
});

module.exports = router;
