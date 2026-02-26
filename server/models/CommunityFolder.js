import mongoose from 'mongoose';

const communityFolderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityFolder', default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('CommunityFolder', communityFolderSchema);
