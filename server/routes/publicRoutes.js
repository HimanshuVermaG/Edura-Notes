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

const EXPLORE_NOTES_LIMIT = 50;
const EXPLORE_USERS_LIMIT = 20;

router.get('/explore/notes', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const excludeUserId = (req.query.excludeUserId || '').trim();
    const mongoose = (await import('mongoose')).default;
    const filter = { isPublic: true };
    if (excludeUserId && mongoose.Types.ObjectId.isValid(excludeUserId)) {
      filter.userId = { $ne: new mongoose.Types.ObjectId(excludeUserId) };
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { originalName: { $regex: escaped, $options: 'i' } },
      ];
    }
    const notes = await Note.find(filter)
      .populate('userId', 'name')
      .populate('folderId', 'name')
      .sort({ updatedAt: -1 })
      .limit(EXPLORE_NOTES_LIMIT)
      .lean();
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to search notes' });
  }
});

router.get('/explore/users', async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const mongoose = (await import('mongoose')).default;
    const userIds = await Note.distinct('userId', { isPublic: true });
    if (userIds.length === 0) {
      return res.json({ users: [] });
    }
    const userFilter = { _id: { $in: userIds } };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userFilter.name = { $regex: escaped, $options: 'i' };
    }
    const users = await User.find(userFilter)
      .select('_id name')
      .sort({ name: 1 })
      .limit(EXPLORE_USERS_LIMIT)
      .lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to search users' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('_id name').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const folders = await Folder.find({ userId }).sort({ order: 1, name: 1 }).lean();
    const notes = await Note.find({ userId, isPublic: true })
      .populate('userId', 'name')
      .populate('folderId', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ user, folders, notes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load profile' });
  }
});

router.get('/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, isPublic: true })
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
    const note = await Note.findOne({ _id: req.params.id, isPublic: true });
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
