import express from 'express';
import fs from 'fs';
import User from '../models/User.js';
import Note from '../models/Note.js';
import Folder from '../models/Folder.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { getUploadPath } from '../middleware/uploadMiddleware.js';
import { getResourceType, destroyCloudinaryAsset } from '../lib/cloudinaryNotes.js';
import { getUsedStorageBytes } from '../lib/storageHelper.js';

const DEFAULT_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB

function getMimeType(note) {
  if (note.mimeType) return note.mimeType;
  const ext = (note.fileName || '').toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/octet-stream';
}

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/stats - dashboard totals (total users, notes, storage)
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalNotesResult] = await Promise.all([
      User.countDocuments(),
      Note.aggregate([{ $group: { _id: null, count: { $sum: 1 }, usedBytes: { $sum: { $ifNull: ['$size', 0] } } } }]),
    ]);
    const totalNotes = totalNotesResult[0]?.count ?? 0;
    const totalUsedBytes = totalNotesResult[0]?.usedBytes ?? 0;
    res.json({ totalUsers, totalNotes, totalUsedBytes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load stats' });
  }
});

// GET /api/admin/users - list users with note count and storage (paginated)
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();

    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('name email createdAt role storageLimitBytes')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const userIds = users.map((u) => u._id);
    const counts = await Note.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, usedBytes: { $sum: { $ifNull: ['$size', 0] } } } },
    ]);
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

    res.json({ users: list, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list users' });
  }
});

// GET /api/admin/users/:userId - single user with paginated notes and storage
router.get('/users/:userId', async (req, res) => {
  try {
    const notesPage = Math.max(1, parseInt(req.query.notesPage, 10) || 1);
    const notesLimit = Math.min(100, Math.max(1, parseInt(req.query.notesLimit, 10) || 10));

    const user = await User.findById(req.params.userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    const usedBytes = await getUsedStorageBytes(req.params.userId);
    const storageLimitBytes = user.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;

    const [notesTotal, notes] = await Promise.all([
      Note.countDocuments({ userId: req.params.userId }),
      Note.find({ userId: req.params.userId })
        .select('title originalName mimeType size isPublic listedOnExplore createdAt fileName fileUrl')
        .sort({ createdAt: -1 })
        .skip((notesPage - 1) * notesLimit)
        .limit(notesLimit)
        .lean(),
    ]);

    res.json({
      user: { ...user, storageLimitBytes },
      usedBytes,
      notes,
      notesTotal,
      notesPage,
      notesLimit,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get user' });
  }
});

// PUT /api/admin/users/:userId - update user (storage limit, profileListedOnExplore)
router.put('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const update = {};
    if (typeof req.body.storageLimitBytes === 'number') {
      if (req.body.storageLimitBytes < 0) {
        return res.status(400).json({ message: 'storageLimitBytes must be non-negative' });
      }
      update.storageLimitBytes = req.body.storageLimitBytes;
    }
    if (typeof req.body.profileListedOnExplore === 'boolean') {
      update.profileListedOnExplore = req.body.profileListedOnExplore;
    }
    if (Object.keys(update).length === 0) {
      const user = await User.findById(userId).select('-password').lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ user });
    }
    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select('-password').lean();
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

// GET /api/admin/notes/:id - get note by id (admin only, any user's note)
router.get('/notes/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('userId', 'name email').lean();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get note' });
  }
});

// PATCH /api/admin/notes/:id - update note listedOnExplore (admin only)
router.patch('/notes/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    if (typeof req.body.listedOnExplore !== 'boolean') {
      return res.status(400).json({ message: 'listedOnExplore must be a boolean' });
    }
    const note = await Note.findByIdAndUpdate(
      noteId,
      { listedOnExplore: req.body.listedOnExplore },
      { new: true }
    )
      .populate('userId', 'name email')
      .lean();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update note' });
  }
});

// GET /api/admin/notes/:id/file - serve file for note (admin only)
router.get('/notes/:id/file', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).lean();
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (!note.fileName) return res.status(404).json({ message: 'No file for this note' });
    if (note.fileUrl) {
      return res.redirect(302, note.fileUrl);
    }
    const filePath = getUploadPath(note.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    const contentType = getMimeType(note);
    const dispName = note.originalName || note.fileName || 'file';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="' + dispName + '"');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get file' });
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
