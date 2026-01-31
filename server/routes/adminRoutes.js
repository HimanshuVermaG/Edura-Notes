import express from 'express';
import User from '../models/User.js';
import Note from '../models/Note.js';
import Folder from '../models/Folder.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { getResourceType, destroyCloudinaryAsset } from '../lib/cloudinaryNotes.js';
import { getUsedStorageBytes } from '../lib/storageHelper.js';

const DEFAULT_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/users - list users with note count and storage
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('name email createdAt role storageLimitBytes').sort({ name: 1 }).lean();
    const counts = await Note.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 }, usedBytes: { $sum: { $ifNull: ['$size', 0] } } } }]);
    const byUser = Object.fromEntries(counts.map((c) => [String(c._id), { count: c.count, usedBytes: c.usedBytes ?? 0 }]));
    const list = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      role: u.role,
      noteCount: byUser[String(u._id)]?.count ?? 0,
      usedBytes: byUser[String(u._id)]?.usedBytes ?? 0,
      storageLimitBytes: u.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES,
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list users' });
  }
});

// GET /api/admin/users/:userId - single user with notes and storage
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const usedBytes = await getUsedStorageBytes(req.params.userId);
    const storageLimitBytes = user.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;
    const notes = await Note.find({ userId: req.params.userId })
      .select('title originalName mimeType size isPublic createdAt fileName fileUrl')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ user: { ...user, storageLimitBytes }, usedBytes, notes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get user' });
  }
});

// PUT /api/admin/users/:userId - update user storage limit (admin only)
router.put('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const storageLimitBytes = req.body.storageLimitBytes;
    if (typeof storageLimitBytes !== 'number' || storageLimitBytes < 0) {
      return res.status(400).json({ message: 'storageLimitBytes must be a non-negative number' });
    }
    const user = await User.findByIdAndUpdate(userId, { storageLimitBytes }, { new: true }).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:userId - delete user and cascade
router.delete('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const notes = await Note.find({ userId }).lean();
    for (const note of notes) {
      if (note.fileUrl && note.fileName) {
        try {
          await destroyCloudinaryAsset(note.fileName, getResourceType(note.mimeType));
        } catch {}
      }
      await Note.deleteOne({ _id: note._id });
    }
    await Folder.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete user' });
  }
});

// DELETE /api/admin/notes - bulk delete notes (body: { noteIds: string[] })
router.delete('/notes', async (req, res) => {
  try {
    const noteIds = Array.isArray(req.body.noteIds) ? req.body.noteIds : [];
    if (noteIds.length === 0) {
      return res.status(400).json({ message: 'noteIds array is required' });
    }
    const deleted = [];
    for (const id of noteIds) {
      const note = await Note.findById(id).lean();
      if (!note) continue;
      if (note.fileUrl && note.fileName) {
        try {
          await destroyCloudinaryAsset(note.fileName, getResourceType(note.mimeType));
        } catch {}
      }
      await Note.deleteOne({ _id: id });
      deleted.push(id);
    }
    res.json({ message: 'Notes deleted', deleted, count: deleted.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete notes' });
  }
});

export default router;
