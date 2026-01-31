import express from 'express';
import fs from 'fs';
import Note from '../models/Note.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { uploadPdf, getUploadPath } from '../middleware/uploadMiddleware.js';
import cloudinary, { isCloudinaryConfigured } from '../lib/cloudinary.js';
import { getResourceType, destroyCloudinaryAsset } from '../lib/cloudinaryNotes.js';

const CLOUDINARY_FOLDER = 'notes-app';

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

router.get('/', async (req, res) => {
  try {
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
    const notes = await Note.find(filter).populate('userId', 'name').sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list notes' });
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
    if (!req.file) return res.status(400).json({ message: 'PDF or image file is required' });
    if (!isCloudinaryConfigured) {
      return res.status(503).json({
        message: 'File upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to server/.env.',
      });
    }
    const title = (req.body.title || req.file.originalname || 'Untitled').trim() || 'Untitled';
    const description = (req.body.description || '').trim();
    const folderId = req.body.folderId || null;
    const isPublic = req.body.isPublic === 'true' || req.body.isPublic === true;
    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
    const note = await Note.create({
      title,
      description: description || '',
      fileName: result.public_id,
      fileUrl: result.secure_url,
      originalName: req.file.originalname || '',
      mimeType: req.file.mimetype || 'application/pdf',
      size: req.file.size ?? null,
      userId: req.user._id,
      folderId: folderId || null,
      isPublic,
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create note' });
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

    if (req.file) {
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
      if (hadCloudinary) {
        try {
          await destroyCloudinaryAsset(oldPublicId, getResourceType(note.mimeType));
        } catch {}
      } else {
        const oldPath = getUploadPath(oldPublicId);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }
      note.fileName = result.public_id;
      note.fileUrl = result.secure_url;
      note.originalName = req.file.originalname || '';
      note.mimeType = req.file.mimetype || note.mimeType || 'application/pdf';
      note.size = req.file.size ?? note.size ?? null;
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
    if (note.fileUrl) {
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
