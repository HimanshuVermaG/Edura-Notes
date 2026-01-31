import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo123456';
const DEMO_NAME = 'Demo User';

async function seedDemoUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app';
  await mongoose.connect(uri);

  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    console.log('Demo user already exists:', DEMO_EMAIL);
    await mongoose.disconnect();
    process.exit(0);
    return;
  }

  await User.create({
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });

  console.log('Demo user created successfully.');
  console.log('  Email:', DEMO_EMAIL);
  console.log('  Password:', DEMO_PASSWORD);
  await mongoose.disconnect();
  process.exit(0);
}

seedDemoUser().catch((err) => {
  console.error(err);
  process.exit(1);
});
