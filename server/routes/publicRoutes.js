import express from 'express';
import fs from 'fs';
import Note from '../models/Note.js';
import User from '../models/User.js';
import Folder from '../models/Folder.js';
import Community from '../models/Community.js';
import CommunityFolder from '../models/CommunityFolder.js';
import CommunityFile from '../models/CommunityFile.js';
import CommunityMember from '../models/CommunityMember.js';
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
const COMMUNITIES_MAX_LIMIT = 100;

/** Explore page: only notes explicitly approved by admin to show on explore. */
const exploreNotesFilter = { listedOnExplore: true };

function getExploreNotesSort(sortBy) {
  const key = (sortBy || 'time').toLowerCase();
  if (key === 'name') return { title: 1 };
  if (key === 'size') return { size: 1 };
  return { updatedAt: -1 }; // time: newest first
}

router.get('/explore/notes', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(EXPLORE_NOTES_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();
    const excludeUserId = (req.query.excludeUserId || '').trim();
    const sortBy = (req.query.sortBy || 'time').trim();
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
    const sort = getExploreNotesSort(sortBy);
    const [total, notes] = await Promise.all([
      Note.countDocuments(filter),
      Note.find(filter)
        .populate('userId', 'name picture')
        .populate('folderId', 'name')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ notes, total, page, limit });
  } catch (err) {
    console.error('[publicRoutes] /explore/notes error:', err);
    res.status(500).json({ message: err.message || 'Failed to search notes' });
  }
});

/** Explore page: only users whose profile is approved by admin to show on explore. */
router.get('/explore/users', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(EXPLORE_USERS_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = (req.query.search || '').trim();
    const userFilter = { profileListedOnExplore: true };
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      userFilter.name = { $regex: escaped, $options: 'i' };
    }
    const [total, users] = await Promise.all([
      User.countDocuments(userFilter),
      User.find(userFilter)
        .select('_id name picture')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ users, total, page, limit });
  } catch (err) {
    console.error('[publicRoutes] /explore/users error:', err);
    res.status(500).json({ message: err.message || 'Failed to search users' });
  }
});

/** Public list of all admin-created communities (no auth). */
router.get('/communities', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(COMMUNITIES_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim();
    const tag = (req.query.tag || '').trim();
    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (tag) filter.tags = tag;
    const [total, communities] = await Promise.all([
      Community.countDocuments(filter),
      Community.find(filter)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    const communityIds = communities.map((c) => c._id);
    const fileCounts = await CommunityFile.aggregate([
      { $match: { communityId: { $in: communityIds } } },
      { $group: { _id: '$communityId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(fileCounts.map((d) => [String(d._id), d.count]));
    const list = communities.map((c) => ({
      _id: c._id,
      name: c.name,
      description: c.description || '',
      coverUrl: c.coverUrl || null,
      tags: c.tags || [],
      fileCount: countMap[String(c._id)] ?? 0,
      createdBy: c.createdBy ? { name: c.createdBy.name } : null,
    }));
    res.json({ communities: list, total, page, limit });
  } catch (err) {
    console.error('[publicRoutes] /communities error:', err);
    res.status(500).json({ message: err.message || 'Failed to list communities' });
  }
});

function getCommunityFileMimeType(file) {
  if (file.mimeType) return file.mimeType;
  const ext = (file.fileName || file.originalName || '').toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/octet-stream';
}

/** Public single community file metadata (no auth). */
router.get('/communities/:communityId/files/:fileId', async (req, res) => {
  try {
    const file = await CommunityFile.findOne({
      _id: req.params.fileId,
      communityId: req.params.communityId,
    }).lean();
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json({
      _id: file._id,
      title: file.title || file.originalName || 'Untitled',
      originalName: file.originalName,
      fileName: file.fileName,
      mimeType: getCommunityFileMimeType(file),
    });
  } catch (err) {
    console.error('[publicRoutes] /communities/:communityId/files/:fileId error:', err);
    res.status(500).json({ message: err.message || 'Failed to load file' });
  }
});

/** Public single community file blob (no auth). Redirect to storage or stream. */
router.get('/communities/:communityId/files/:fileId/file', async (req, res) => {
  try {
    const file = await CommunityFile.findOne({
      _id: req.params.fileId,
      communityId: req.params.communityId,
    });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.fileUrl) {
      return res.redirect(302, file.fileUrl);
    }
    return res.status(404).json({ message: 'No file content' });
  } catch (err) {
    console.error('[publicRoutes] /communities/:communityId/files/:fileId/file error:', err);
    res.status(500).json({ message: err.message || 'Failed to get file' });
  }
});

/** Public single community with folders and files (no auth). */
router.get('/communities/:id', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('createdBy', 'name')
      .lean();
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const [folders, files, memberCount] = await Promise.all([
      CommunityFolder.find({ communityId: community._id, parentId: null }).sort({ order: 1, createdAt: 1 }).lean(),
      CommunityFile.find({ communityId: community._id }).sort({ createdAt: 1 }).lean(),
      CommunityMember.countDocuments({ communityId: community._id }),
    ]);
    res.json({
      _id: community._id,
      name: community.name,
      description: community.description || '',
      coverUrl: community.coverUrl || null,
      tags: community.tags || [],
      createdBy: community.createdBy ? { name: community.createdBy.name } : null,
      memberCount: memberCount ?? 0,
      folders,
      files,
    });
  } catch (err) {
    console.error('[publicRoutes] /communities/:id error:', err);
    res.status(500).json({ message: err.message || 'Failed to load community' });
  }
});

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('_id name profileListedOnExplore picture').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hasVisibleNotes = await Note.exists({ userId, $or: [ { isPublic: true }, { listedOnExplore: true } ] });
    const profileViewable = user.profileListedOnExplore === true || hasVisibleNotes;
    if (!profileViewable) {
      return res.status(404).json({ message: 'Profile not found or private' });
    }

    const [folders, notes, memberships] = await Promise.all([
      Folder.find({ userId }).sort({ order: 1, name: 1 }).lean(),
      Note.find({
        userId,
        $or: [ { isPublic: true }, { listedOnExplore: true } ],
      })
        .populate('userId', 'name')
        .populate('folderId', 'name')
        .sort({ updatedAt: -1 })
        .lean(),
      CommunityMember.find({ userId })
        .populate('communityId', 'name _id')
        .lean(),
    ]);
    const membershipOrder = (memberships || [])
      .filter((m) => m.communityId)
      .map((m) => m.communityId._id);
    const communityIds = [...new Set(membershipOrder)];
    const [communityDocs, fileCounts] = await Promise.all([
      communityIds.length
        ? Community.find({ _id: { $in: communityIds } }).select('name description coverUrl').lean()
        : [],
      communityIds.length
        ? CommunityFile.aggregate([
            { $match: { communityId: { $in: communityIds } } },
            { $group: { _id: '$communityId', count: { $sum: 1 } } },
          ])
        : [],
    ]);
    const communityMap = Object.fromEntries(
      communityDocs.map((c) => [String(c._id), { _id: c._id, name: c.name, description: c.description || '', coverUrl: c.coverUrl || null }])
    );
    const countMap = Object.fromEntries((fileCounts || []).map((d) => [String(d._id), d.count]));
    const joinedCommunities = membershipOrder
      .map((id) => {
        const c = communityMap[String(id)];
        if (!c) return null;
        return { ...c, fileCount: countMap[String(id)] ?? 0 };
      })
      .filter(Boolean);

    res.json({
      user: { _id: user._id, name: user.name, picture: user.picture || '' },
      folders,
      notes,
      joinedCommunities,
    });
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
