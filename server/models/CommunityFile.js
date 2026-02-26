import mongoose from 'mongoose';

const communityFileSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    originalName: { type: String, default: '' },
    fileName: { type: String, required: true },
    fileUrl: { type: String, default: null },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number, default: null },
    communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
    communityFolderId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityFolder', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('CommunityFile', communityFileSchema);
