const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For development, use Gmail or create a test account
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development: Use Gmail or create a test account
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });
  }
};

// Send email function
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Lost & Found System <noreply@lostfound.com>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcome: (userName) => ({
    subject: 'Welcome to the Lost & Found System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Welcome to the Lost & Found System!</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for joining our Lost & Found community! We're here to help you find your lost items and return found items to their rightful owners.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Getting Started:</h3>
          <ul style="color: #34495e;">
            <li>Report lost items with detailed descriptions and photos</li>
            <li>Report found items to help others</li>
            <li>Search through existing reports</li>
            <li>Get notified when potential matches are found</li>
          </ul>
        </div>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>Lost & Found System Team</p>
      </div>
    `
  }),

  itemMatch: (lostItem, foundItem, userName) => ({
    subject: 'Great News! Your Lost Item May Have Been Found',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">Potential Match Found!</h2>
        <p>Hello ${userName},</p>
        <p>We have found a potential match for your lost item: <strong>${lostItem.title}</strong></p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Found Item Details:</h3>
          <ul style="color: #34495e;">
            <li><strong>Title:</strong> ${foundItem.title}</li>
            <li><strong>Category:</strong> ${foundItem.category}</li>
            <li><strong>Location:</strong> ${foundItem.location.address}</li>
            <li><strong>Date Found:</strong> ${new Date(foundItem.date).toLocaleDateString()}</li>
          </ul>
        </div>
        <p>Please review the details and contact us if this matches your lost item.</p>
        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>Lost & Found System Team</p>
      </div>
    `
  }),

  itemClaimed: (item, claimedByUser, userName) => ({
    subject: 'Your Item Has Been Claimed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Item Successfully Claimed!</h2>
        <p>Hello ${userName},</p>
        <p>Your ${item.type} item: <strong>${item.title}</strong> has been successfully claimed.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Claim Details:</h3>
          <ul style="color: #34495e;">
            <li><strong>Claimed By:</strong> ${claimedByUser.firstName} ${claimedByUser.lastName}</li>
            <li><strong>Claim Date:</strong> ${new Date().toLocaleDateString()}</li>
            <li><strong>Item:</strong> ${item.title}</li>
          </ul>
        </div>
        <p>Thank you for using our Lost & Found system!</p>
        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>Lost & Found System Team</p>
      </div>
    `
  }),

  systemNotification: (subject, message, userName) => ({
    subject: `Lost & Found System: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">${subject}</h2>
        <p>Hello ${userName},</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #34495e; margin: 0;">${message}</p>
        </div>
        <p style="color: #7f8c8d; font-size: 14px;">Best regards,<br>Lost & Found System Team</p>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};
