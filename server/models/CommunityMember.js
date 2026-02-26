import mongoose from 'mongoose';

const communityMemberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  },
  { timestamps: true }
);

communityMemberSchema.index({ userId: 1, communityId: 1 }, { unique: true });

export default mongoose.model('CommunityMember', communityMemberSchema);
