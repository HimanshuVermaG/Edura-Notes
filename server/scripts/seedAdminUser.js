import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function seedAdminUser() {
  const rawEmail = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = rawEmail ? String(rawEmail).trim().toLowerCase() : '';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env to create an admin user.');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('ADMIN_PASSWORD must be at least 6 characters.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';
  await mongoose.connect(uri);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.password = password;
    await existing.save();
    console.log('Admin user updated:', email);
  } else {
    await User.create({
      name,
      email,
      password,
      role: 'admin',
    });
    console.log('Admin user created successfully.');
    console.log('  Email:', email);
    console.log('  Password: (from ADMIN_PASSWORD)');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdminUser().catch((err) => {
  console.error(err);
  process.exit(1);
});
