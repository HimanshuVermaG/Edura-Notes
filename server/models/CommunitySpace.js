import mongoose from 'mongoose';

const communitySpaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: 'Hash' }, // Lucide icon name
    description: { type: String, trim: true, default: '' },
    topics: [{ type: String, trim: true }],
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, default: 'General' },
    color: { type: String, default: 'from-indigo-600 to-purple-600' },
    tags: [{ type: String }],
    rules: [{ type: String }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    membersCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model('CommunitySpace', communitySpaceSchema);
