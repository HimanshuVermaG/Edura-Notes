import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    fileName: { type: String, default: null },
    fileUrl: { type: String, default: null },
    driveLink: { type: String, default: null },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    isPublic: { type: Boolean, default: false },
    listedOnExplore: { type: Boolean, default: false },
    communitySpaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunitySpace', default: null },
    communityTopic: { type: String, default: null, trim: true },
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
    deletedAt: { type: Date, default: null },
    votes: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      value: { type: Number, enum: [1, -1], required: true }
    }]
  },
  { timestamps: true }
);

export default mongoose.model('Note', noteSchema);
