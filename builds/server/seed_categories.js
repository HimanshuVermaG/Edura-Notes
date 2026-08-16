import mongoose from 'mongoose';
import CommunityCategory from './models/CommunityCategory.js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const CATEGORIES = ['General', 'Technology', 'Creativity', 'Gaming', 'Literature', 'Lifestyle', 'Science', 'Engineering'];
  for (const cat of CATEGORIES) {
    const exists = await CommunityCategory.findOne({ name: cat });
    if (!exists) {
      await CommunityCategory.create({ name: cat });
      console.log('Created:', cat);
    }
  }
  console.log('Done seeding.');
  process.exit(0);
}
seed();
