import express from 'express';
import fs from 'fs';
import Note from '../models/Note.js';
import User from '../models/User.js';
import Folder from '../models/Folder.js';
import { getUploadPath } from '../middleware/uploadMiddleware.js';

function getMimeType(note) {
  if (note.mimeType) return note.mimeType;
  const ext = (note.fileName || '').toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/octet-stream';
}

const router = express.Router();

const EXPLORE_NOTES_MAX_LIMIT = 100;
const EXPLORE_USERS_MAX_LIMIT = 100;

const exploreNotesFilter = { $or: [ { isPublic: true }, { listedOnExplore: true } ] };

router.get('/explore/notes', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(EXPLORE_NOTES_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();
    const excludeUserId = (req.query.excludeUserId || '').trim();
    const mongoose = (await import('mongoose')).default;
    const filter = { $and: [ exploreNotesFilter ] };
    if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
      filter.$and.push({ userId: { $ne: new mongoose.Types.ObjectId(excludeUserId) } });
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$and.push({
        $or: [
          { title: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
          { originalName: { $regex: escaped, $options: 'i' } },
        ],
      });
    }
    const [total, notes] = await Promise.all([
      Note.countDocuments(filter),
      Note.find(filter)
        .populate('userId', 'name')
        .populate('folderId', 'name')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ notes, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to search notes' });
  }
});

router.get('/explore/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(EXPLORE_USERS_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();
    const mongoose = (await import('mongoose')).default;
    const noteUserIds = await Note.distinct('userId', exploreNotesFilter);
    const listedUsers = await User.find({ profileListedOnExplore: true }).select('_id').lean();
    const listedIds = listedUsers.map((u) => u._id);
    const allIds = [...new Set([...noteUserIds.map((id) => id.toString()), ...listedIds.map((id) => id.toString())])];
    if (allIds.length === 0) {
      return res.json({ users: [], total: 0, page, limit });
    }
    const userFilter = { _id: { $in: allIds.map((id) => new mongoose.Types.ObjectId(id)) } };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userFilter.name = { $regex: escaped, $options: 'i' };
    }
    const [total, users] = await Promise.all([
      User.countDocuments(userFilter),
      User.find(userFilter)
        .select('_id name')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ users, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to search users' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('_id name profileListedOnExplore').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hasVisibleNotes = await Note.exists({ userId, $or: [ { isPublic: true }, { listedOnExplore: true } ] });
    const profileViewable = user.profileListedOnExplore === true || hasVisibleNotes;
    if (!profileViewable) {
      return res.status(404).json({ message: 'Profile not found or private' });
    }

    const folders = await Folder.find({ userId }).sort({ order: 1, name: 1 }).lean();
    const notes = await Note.find({
      userId,
      $or: [ { isPublic: true }, { listedOnExplore: true } ],
    })
      .populate('userId', 'name')
      .populate('folderId', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ user: { _id: user._id, name: user.name }, folders, notes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load profile' });
  }
});

router.get('/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [ { isPublic: true }, { listedOnExplore: true } ],
    })
      .populate('userId', 'name')
      .populate('folderId', 'name')
      .lean();
    if (!note) return res.status(404).json({ message: 'Note not found or private' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load note' });
  }
});

router.get('/notes/:id/file', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [ { isPublic: true }, { listedOnExplore: true } ],
    });
    if (!note) return res.status(404).json({ message: 'Note not found or private' });
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

export default router;
