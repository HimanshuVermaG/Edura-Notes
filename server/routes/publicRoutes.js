import express from 'express';
import fs from 'fs';
import { Readable } from 'stream';
import Note from '../models/Note.js';
import User from '../models/User.js';
import Folder from '../models/Folder.js';
import { getUploadPath } from '../middleware/uploadMiddleware.js';
import { fetchDriveStream, extractDriveFileId } from '../lib/driveHelper.js';
import { sanitizeFilenameForHeader } from '../lib/http.js';

function getMimeType(note) {
  if (note.mimeType) return note.mimeType;
  const ext = (note.fileName || '').toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/octet-stream';
}

const router = express.Router();

// Base URL for absolute <loc> entries in the sitemap. Falls back to the same
// domain used in client/index.html and client/src/utils/seo.js if
// CLIENT_ORIGIN isn't set in the server's env — set CLIENT_ORIGIN there for
// real, this fallback is just a safety net.
const SITE_ORIGIN = (process.env.CLIENT_ORIGIN || 'https://noteshandling.zya.me').split(',')[0].trim().replace(/\/$/, '');

const NOTE_VISIBLE_TO_ANY_USER = { $or: [{ isPublic: true }, { listedOnExplore: true }, { communitySpaceId: { $ne: null }, status: 'approved' }] };

function xmlEscape(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function urlEntry(loc, lastmod) {
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}\n  </url>`;
}

// GET /api/public/sitemap.xml — lists every currently-public page: the fixed
// static routes plus every visible note and profile. Reuses the same
// visibility rule as the rest of this file (isPublic / listedOnExplore /
// approved-community) so nothing private ever ends up here.
router.get('/sitemap.xml', async (req, res) => {
  try {
    const visibleNotes = await Note.find(NOTE_VISIBLE_TO_ANY_USER).select('_id userId updatedAt').lean();
    const exploreUsers = await User.find({ profileListedOnExplore: true }).select('_id updatedAt').lean();

    const profileMap = new Map();
    for (const u of exploreUsers) profileMap.set(String(u._id), u.updatedAt);
    for (const n of visibleNotes) {
      const uid = String(n.userId);
      if (!profileMap.has(uid) || n.updatedAt > profileMap.get(uid)) profileMap.set(uid, n.updatedAt);
    }

    const staticUrls = ['/', '/community', '/score-calculator'].map((p) => urlEntry(`${SITE_ORIGIN}${p}`));
    const noteUrls = visibleNotes.map((n) => urlEntry(`${SITE_ORIGIN}/view/note/${n._id}`, n.updatedAt));
    const profileUrls = Array.from(profileMap.entries()).map(([uid, updatedAt]) => urlEntry(`${SITE_ORIGIN}/profile/${uid}`, updatedAt));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...profileUrls, ...noteUrls].join('\n')}\n</urlset>\n`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('[publicRoutes] /sitemap.xml error:', err);
    res.status(500).json({ message: 'Failed to generate sitemap' });
  }
});

const EXPLORE_NOTES_MAX_LIMIT = 100;
const EXPLORE_USERS_MAX_LIMIT = 100;

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
    // Always filter to admin-listed files only (public notes must be explicitly approved).
    const visibilityFilter = exploreNotesFilter;
    const filter = { $and: [ visibilityFilter ] };
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

router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`[publicRoutes] GET /profile/${userId} called`);
    const user = await User.findById(userId).select('_id name profileListedOnExplore picture bio socialLinks').lean();
    if (!user) {
      console.log(`[publicRoutes] User not found for id: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const folders = await Folder.find({ userId }).sort({ order: 1, name: 1 }).lean();
    const notes = await Note.find({
      userId,
      $or: [ { isPublic: true }, { listedOnExplore: true }, { communitySpaceId: { $ne: null }, status: 'approved' } ],
    })
      .populate('userId', 'name')
      .populate('folderId', 'name')
      .populate('communitySpaceId', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    const badges = [];
    if (notes.length >= 1) badges.push({ id: 'contributor', name: 'Contributor', color: '#10b981', icon: 'Star' });
    if (notes.length >= 5) badges.push({ id: 'bronze', name: 'Bronze Scholar', color: '#f59e0b', icon: 'Award' });
    if (notes.length >= 15) badges.push({ id: 'silver', name: 'Silver Sage', color: '#94a3b8', icon: 'Medal' });
    if (notes.length >= 50) badges.push({ id: 'gold', name: 'Gold Master', color: '#fbbf24', icon: 'Trophy' });

    res.json({ user: { _id: user._id, name: user.name, picture: user.picture || '', bio: user.bio, socialLinks: user.socialLinks, badges }, folders, notes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load profile' });
  }
});

router.get('/notes/:id', async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      $or: [ { isPublic: true }, { listedOnExplore: true }, { communitySpaceId: { $ne: null }, status: 'approved' } ],
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
      $or: [ { isPublic: true }, { listedOnExplore: true }, { communitySpaceId: { $ne: null }, status: 'approved' } ],
    });
    if (!note) return res.status(404).json({ message: 'Note not found or private' });
    
    if (note.driveLink) {
      const fileId = extractDriveFileId(note.driveLink);
      if (!fileId) return res.status(400).json({ message: 'Invalid Google Drive link' });
      
      try {
        const fetchResponse = await fetchDriveStream(fileId);
        const contentType = fetchResponse.headers.get('content-type') || note.mimeType || 'application/pdf';
        const contentLength = fetchResponse.headers.get('content-length');
        const dispName = note.originalName || 'drive_file';
        
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Content-Disposition', 'inline; filename="' + sanitizeFilenameForHeader(dispName) + '"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition');
        
        return Readable.fromWeb(fetchResponse.body).pipe(res);
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    }
    
    if (!note.fileName) return res.status(404).json({ message: 'No file for this note' });
    if (note.fileUrl) {
      try {
        const fetchRes = await fetch(note.fileUrl);
        if (!fetchRes.ok) throw new Error('Failed to fetch from cloud storage');
        const contentType = fetchRes.headers.get('content-type') || note.mimeType || 'application/pdf';
        const contentLength = fetchRes.headers.get('content-length');
        const dispName = note.originalName || note.fileName || 'file';
        
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Content-Disposition', 'inline; filename="' + sanitizeFilenameForHeader(dispName) + '"');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition');
        
        return Readable.fromWeb(fetchRes.body).pipe(res);
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    }
    const filePath = getUploadPath(note.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    const stat = fs.statSync(filePath);
    const contentType = getMimeType(note);
    const dispName = note.originalName || note.fileName || 'file';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline; filename="' + sanitizeFilenameForHeader(dispName) + '"');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Content-Disposition');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get file' });
  }
});

export default router;
