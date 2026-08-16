import express from 'express';
import Annotation from '../models/Annotation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

// GET /api/annotations/:noteId
router.get('/:noteId', async (req, res) => {
  try {
    const annotations = await Annotation.find({
      noteId: req.params.noteId,
      userId: req.user._id
    }).sort({ createdAt: 1 });
    res.json(annotations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch annotations' });
  }
});

// POST /api/annotations
router.post('/', async (req, res) => {
  try {
    const { noteId, pageNumber, x, y, text, color } = req.body;
    if (!noteId || !pageNumber || x == null || y == null || !text) {
      return res.status(400).json({ message: 'Missing required annotation fields' });
    }
    const annotation = await Annotation.create({
      noteId,
      userId: req.user._id,
      pageNumber,
      x,
      y,
      text,
      color: color || '#fbbf24'
    });
    res.status(201).json(annotation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create annotation' });
  }
});

// PUT /api/annotations/:id
router.put('/:id', async (req, res) => {
  try {
    const { text, color, x, y } = req.body;
    const annotation = await Annotation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { text, color, x, y } },
      { new: true }
    );
    if (!annotation) return res.status(404).json({ message: 'Annotation not found or unauthorized' });
    res.json(annotation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update annotation' });
  }
});

// DELETE /api/annotations/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await Annotation.deleteOne({ _id: req.params.id, userId: req.user._id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Annotation not found or unauthorized' });
    res.json({ message: 'Annotation deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete annotation' });
  }
});

export default router;
