import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

async function seedAdminUser() {
  const rawEmail = process.env.ADMIN_EMAIL;
  const email = rawEmail ? String(rawEmail).trim().toLowerCase() : '';

  if (!email) {
    console.error('Set ADMIN_EMAIL in server/.env (the Google account email that should be admin).');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';
  await mongoose.connect(uri);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    await existing.save();
    console.log('Admin role set for:', email);
  } else {
    console.log('No user found with email:', email);
    console.log('Sign in with Google using that email first, then run this script again to set admin role.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

seedAdminUser().catch((err) => {
  console.error(err);
  process.exit(1);
});
