import express from 'express';
import fs from 'fs';
import { Readable } from 'stream';
import Note from '../models/Note.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { uploadPdf, getUploadPath } from '../middleware/uploadMiddleware.js';
import cloudinary, { isCloudinaryConfigured } from '../lib/cloudinary.js';
import { getResourceType, destroyCloudinaryAsset } from '../lib/cloudinaryNotes.js';
import { getUsedStorageBytes } from '../lib/storageHelper.js';
import { fetchDriveStream } from '../lib/driveHelper.js';

const CLOUDINARY_FOLDER = 'notes-app';
const DEFAULT_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB

function formatStorageMessage(usedBytes, limitBytes) {
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(1);
  const limitMB = (limitBytes / (1024 * 1024)).toFixed(1);
  return `Storage limit exceeded (${usedMB} MB / ${limitMB} MB). Delete some files or ask an admin to increase your limit.`;
}

function uploadBufferToCloudinary(buffer, mimeType) {
  const resourceType = getResourceType(mimeType);
  const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  return cloudinary.uploader.upload(dataUri, {
    resource_type: resourceType,
    folder: CLOUDINARY_FOLDER,
  });
}

const router = express.Router();
router.use(authMiddleware);

const NOTES_LIST_MAX_LIMIT = 100;

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(NOTES_LIST_MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const filter = { userId: req.user._id };
    // Multi-folder filter: folderIds=null,id1,id2 (comma-separated; "null" = uncategorized)
    const folderIdsRaw = req.query.folderIds;
    if (folderIdsRaw != null && String(folderIdsRaw).trim() !== '') {
      const mongoose = (await import('mongoose')).default;
      const parts = String(folderIdsRaw).split(',').map((s) => s.trim()).filter(Boolean);
      const folderIds = parts.map((p) => (p === 'null' ? null : p));
      const validIds = folderIds.filter((id) => id === null || mongoose.Types.ObjectId.isValid(id));
      if (validIds.length > 0) {
        filter.folderId = { $in: validIds };
      }
    } else if (req.query.folderId != null) {
      // Legacy single folder
      filter.folderId = req.query.folderId === 'null' ? null : req.query.folderId;
    }
    const search = (req.query.search || '').trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Case-insensitive search (i flag) on title, description, originalName
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { originalName: { $regex: escaped, $options: 'i' } },
      ];
    }
    const [total, notes] = await Promise.all([
      Note.countDocuments(filter),
      Note.find(filter)
        .populate('userId', 'name')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ notes, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list notes' });
  }
});

router.get('/storage', async (req, res) => {
  try {
    const limitBytes = req.user.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;
    const usedBytes = await getUsedStorageBytes(req.user._id);
    res.json({ usedBytes, limitBytes });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get storage' });
  }
});

router.get('/bookmarks', async (req, res) => {
  try {
    const ids = (req.query.ids || '').split(',').filter(Boolean);
    if (!ids.length) return res.json([]);
    const notes = await Note.find({ _id: { $in: ids } })
      .populate('userId', 'name')
      .lean();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to fetch bookmarks' });
  }
});

function getMimeType(note) {
  if (note.mimeType) return note.mimeType;
  const ext = (note.fileName || '').toLowerCase().replace(/.*\./, '');
  const mime = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  return mime[ext] || 'application/octet-stream';
}

router.get('/:id/file', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    
    if (note.driveLink) {
      const fileIdMatch = note.driveLink.match(/[-\w]{25,}/);
      if (!fileIdMatch) return res.status(400).json({ message: 'Invalid Google Drive link' });
      const fileId = fileIdMatch[0];
      
      try {
        const fetchResponse = await fetchDriveStream(fileId);
        const contentType = fetchResponse.headers.get('content-type') || note.mimeType || 'application/pdf';
        const contentLength = fetchResponse.headers.get('content-length');
        const dispName = note.originalName || 'drive_file';
        
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Content-Disposition', 'inline; filename="' + dispName + '"');
        
        return Readable.fromWeb(fetchResponse.body).pipe(res);
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    }
    
    if (!note.fileName) return res.status(404).json({ message: 'No file for this note' });
    if (note.fileUrl) {
      return res.redirect(302, note.fileUrl);
    }
    const filePath = getUploadPath(note.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });
    const stat = fs.statSync(filePath);
    const contentType = getMimeType(note);
    const dispName = note.originalName || note.fileName || 'file';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'inline; filename="' + dispName + '"');
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    console.error('File fetch error:', err);
    res.status(500).json({ message: err.message || 'Failed to get file' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id }).populate('userId', 'name');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get note' });
  }
});

router.post('/', uploadPdf.single('file'), async (req, res) => {
  try {
    const hasFile = !!req.file;
    const driveLink = req.body.driveLink ? req.body.driveLink.trim() : null;
    
    if (!hasFile && !driveLink) return res.status(400).json({ message: 'PDF/image file OR Google Drive link is required' });
    
    const limitBytes = req.user.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;
    const usedBytes = await getUsedStorageBytes(req.user._id);
    
    let fileName = null;
    let fileUrl = null;
    let originalName = '';
    let mimeType = 'application/pdf';
    let size = null;
    
    if (hasFile) {
      const newTotal = usedBytes + (req.file.size ?? 0);
      if (newTotal > limitBytes) {
        return res.status(413).json({
          message: formatStorageMessage(newTotal, limitBytes),
        });
      }
      if (!isCloudinaryConfigured) {
        return res.status(503).json({
          message: 'File upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to server/.env.',
        });
      }
      const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
      fileName = result.public_id;
      fileUrl = result.secure_url;
      originalName = req.file.originalname || '';
      mimeType = req.file.mimetype || 'application/pdf';
      size = result.bytes || req.file.size || null;
    } else {
      const fileIdMatch = driveLink.match(/[-\w]{25,}/);
      if (!fileIdMatch) return res.status(400).json({ message: 'Invalid Google Drive link format' });
      originalName = 'Drive File';
    }
    
    const title = (req.body.title || (hasFile ? req.file.originalname : 'Drive Note')).trim() || 'Untitled';
    const description = (req.body.description || '').trim();
    const folderId = req.body.folderId || null;
    const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
    
    const communitySpaceId = req.body.communitySpaceId || null;
    const communityTopic = req.body.communityTopic ? req.body.communityTopic.trim() : null;
    const status = communitySpaceId ? 'pending' : 'approved';
    
    const note = await Note.create({
      title,
      description: description || '',
      fileName,
      fileUrl,
      driveLink,
      originalName,
      mimeType,
      size,
      userId: req.user._id,
      folderId: folderId || null,
      isPublic,
      communitySpaceId,
      communityTopic,
      status
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create note' });
  }
});

// PUT /api/notes/:id/contribute - Contribute an existing note to a community space
router.put('/:id/contribute', async (req, res) => {
  try {
    const { communitySpaceId, communityTopic, title, description } = req.body;
    if (!communitySpaceId || !communityTopic) {
      return res.status(400).json({ message: 'communitySpaceId and communityTopic are required' });
    }

    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Mark as pending and link to community space
    note.communitySpaceId = communitySpaceId;
    note.communityTopic = communityTopic.trim();
    if (title !== undefined) note.title = title.trim();
    if (description !== undefined) note.description = description.trim();
    note.status = 'pending';
    note.isPublic = true;

    await note.save();
    res.json(note);
  } catch (err) {
    console.error('[noteRoutes] PUT /:id/contribute error:', err);
    res.status(500).json({ message: err.message || 'Failed to contribute note' });
  }
});

// PUT /api/notes/:id/uncontribute - Remove an existing note from a community space
router.put('/:id/uncontribute', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // Unlink from community space
    note.communitySpaceId = undefined;
    note.communityTopic = undefined;
    
    // Status can optionally be reverted to 'approved' so it just sits in the user's manage page normally
    // but the default flow sets new personal notes to 'approved' anyway.
    note.status = 'approved'; 

    await note.save();
    res.json(note);
  } catch (err) {
    console.error('[noteRoutes] PUT /:id/uncontribute error:', err);
    res.status(500).json({ message: err.message || 'Failed to remove note from community' });
  }
});

router.put('/:id', uploadPdf.single('file'), async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const title = req.body.title !== undefined ? req.body.title.trim() : note.title;
    if (title) note.title = title;
    if (req.body.description !== undefined) note.description = (req.body.description || '').trim();
    if (req.body.folderId !== undefined) note.folderId = req.body.folderId || null;
    if (req.body.isPublic !== undefined) note.isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;

    const driveLink = req.body.driveLink ? req.body.driveLink.trim() : null;

    if (req.file) {
      const limitBytes = req.user.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES;
      const usedBytes = await getUsedStorageBytes(req.user._id);
      const currentNoteSize = note.size ?? 0;
      const newTotal = usedBytes - currentNoteSize + (req.file.size ?? 0);
      if (newTotal > limitBytes) {
        return res.status(413).json({
          message: formatStorageMessage(newTotal, limitBytes),
        });
      }
      if (!isCloudinaryConfigured) {
        return res.status(503).json({
          message: 'File upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to server/.env.',
        });
      }
      const oldPublicId = note.fileName;
      const hadCloudinary = !!note.fileUrl;
      let result;
      try {
        result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        return res.status(500).json({ message: uploadErr.message || 'Failed to upload file' });
      }
      if (hadCloudinary && !note.driveLink) {
        try {
          await destroyCloudinaryAsset(oldPublicId, getResourceType(note.mimeType));
        } catch {}
      } else if (note.fileName && !note.driveLink) {
        const oldPath = getUploadPath(oldPublicId);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }
      note.fileName = result.public_id;
      note.fileUrl = result.secure_url;
      note.driveLink = null;
      note.originalName = req.file.originalname || '';
      note.mimeType = req.file.mimetype || note.mimeType || 'application/pdf';
      note.size = result.bytes || req.file.size || note.size || null;
    } else if (driveLink) {
      const fileIdMatch = driveLink.match(/[-\w]{25,}/);
      if (!fileIdMatch) return res.status(400).json({ message: 'Invalid Google Drive link format' });
      
      if (note.fileUrl && !note.driveLink) {
        try {
          await destroyCloudinaryAsset(note.fileName, getResourceType(note.mimeType));
        } catch {}
      } else if (note.fileName && !note.driveLink) {
        const oldPath = getUploadPath(note.fileName);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }
      
      note.driveLink = driveLink;
      note.fileName = null;
      note.fileUrl = null;
      note.originalName = 'Drive File';
      note.mimeType = 'application/pdf';
      note.size = null;
    }

    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update note' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.driveLink) {
      // No external file to delete
    } else if (note.fileUrl) {
      try {
        await destroyCloudinaryAsset(note.fileName, getResourceType(note.mimeType));
      } catch {}
    } else {
      const filePath = getUploadPath(note.fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
    await Note.deleteOne({ _id: note._id });
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete note' });
  }
});

export default router;
