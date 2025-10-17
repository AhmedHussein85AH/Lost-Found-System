const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lost-found-system';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);

    const usersToEnsure = [
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin@12345',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin'
      },
      {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test@12345',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
      }
    ];

    for (const data of usersToEnsure) {
      const exists = await User.findOne({ $or: [{ email: data.email }, { username: data.username }] });
      if (exists) {
        console.log(`Skip existing: ${data.email}`);
        continue;
      }
      const user = new User(data);
      await user.save();
      console.log(`Created: ${data.email} (${data.role})`);
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
