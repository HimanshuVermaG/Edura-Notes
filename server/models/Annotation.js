import mongoose from 'mongoose';

const annotationSchema = new mongoose.Schema(
  {
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pageNumber: { type: Number, required: true },
    x: { type: Number, required: true }, // percentage from left (0-100)
    y: { type: Number, required: true }, // percentage from top (0-100)
    text: { type: String, required: true, maxlength: 1000 },
    color: { type: String, default: '#fbbf24' } // sticky note color (yellow by default)
  },
  { timestamps: true }
);

export default mongoose.model('Annotation', annotationSchema);
