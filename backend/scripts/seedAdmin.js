import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const ADMIN_EMAIL = 'admin@wmt.com';
const ADMIN_PASSWORD = 'Admin@123456';

const seedAdmin = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is missing in environment variables.');
  }

  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: ADMIN_EMAIL });

  if (!user) {
    user = new User({
      name: 'WMT Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      phone: '0770000000',
      role: 'admin',
      emailVerified: true,
    });
    await user.save();
    console.log('Admin user created.');
  } else {
    user.name = 'WMT Admin';
    user.phone = '0770000000';
    user.role = 'admin';
    user.emailVerified = true;
    user.password = ADMIN_PASSWORD;
    await user.save();
    console.log('Admin user updated and password reset.');
  }

  console.log(`Admin login email: ${ADMIN_EMAIL}`);
  console.log(`Admin login password: ${ADMIN_PASSWORD}`);

  await mongoose.disconnect();
};

seedAdmin()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Failed to seed admin:', error.message);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  });
