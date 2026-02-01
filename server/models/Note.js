import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, default: null },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: 'application/pdf' },
    size: { type: Number, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    isPublic: { type: Boolean, default: false },
    listedOnExplore: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Note', noteSchema);
