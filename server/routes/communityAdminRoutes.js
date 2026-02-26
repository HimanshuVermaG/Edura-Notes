import express from 'express';
import Community from '../models/Community.js';
import CommunityFolder from '../models/CommunityFolder.js';
import CommunityFile from '../models/CommunityFile.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import { uploadPdf } from '../middleware/uploadMiddleware.js';
import cloudinary, { isCloudinaryConfigured } from '../lib/cloudinary.js';
import { getResourceType, destroyCloudinaryAsset } from '../lib/cloudinaryNotes.js';

const router = express.Router();
router.use(authMiddleware);
router.use(adminMiddleware);

const CLOUDINARY_FOLDER = 'notes-app';

function uploadBufferToCloudinary(buffer, mimeType, folder = CLOUDINARY_FOLDER) {
  const resourceType = getResourceType(mimeType);
  const dataUri = `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  return cloudinary.uploader.upload(dataUri, {
    resource_type: resourceType,
    folder,
  });
}

// --- Communities CRUD ---

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const search = (req.query.search || '').trim();
    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }
    const [total, communities] = await Promise.all([
      Community.countDocuments(filter),
      Community.find(filter)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);
    res.json({ communities, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list communities' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, coverUrl, tags } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Community name is required' });
    }
    const community = await Community.create({
      name: String(name).trim(),
      description: String(description || '').trim(),
      coverUrl: coverUrl || null,
      tags: Array.isArray(tags) ? tags.filter((t) => t && String(t).trim()) : [],
      createdBy: req.user._id,
    });
    res.status(201).json(community);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create community' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const [folders, fileCount] = await Promise.all([
      CommunityFolder.find({ communityId: community._id }).sort({ order: 1, createdAt: 1 }).lean(),
      CommunityFile.countDocuments({ communityId: community._id }),
    ]);
    res.json({ ...community, folders, fileCount });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to get community' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const { name, description, coverUrl, tags } = req.body;
    if (name !== undefined) community.name = String(name).trim() || community.name;
    if (description !== undefined) community.description = String(description || '').trim();
    if (coverUrl !== undefined) community.coverUrl = coverUrl || null;
    if (tags !== undefined) community.tags = Array.isArray(tags) ? tags.filter((t) => t && String(t).trim()) : community.tags;
    await community.save();
    res.json(community);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update community' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const files = await CommunityFile.find({ communityId: community._id }).lean();
    for (const f of files) {
      if (f.fileUrl) {
        try {
          await destroyCloudinaryAsset(f.fileName, getResourceType(f.mimeType));
        } catch {}
      }
    }
    await CommunityFile.deleteMany({ communityId: community._id });
    await CommunityFolder.deleteMany({ communityId: community._id });
    await Community.deleteOne({ _id: community._id });
    res.json({ message: 'Community deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete community' });
  }
});

// Cover upload (image only)
router.post('/:id/cover', uploadPdf.single('cover'), async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    if (!req.file) return res.status(400).json({ message: 'Cover file is required' });
    const mime = req.file.mimetype || '';
    if (!mime.startsWith('image/')) {
      return res.status(400).json({ message: 'Cover must be an image (JPEG, PNG, GIF, WebP)' });
    }
    if (!isCloudinaryConfigured) {
      return res.status(503).json({ message: 'File upload is not configured. Configure Cloudinary in server/.env.' });
    }
    const folder = `${CLOUDINARY_FOLDER}/communities`;
    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype, folder);
    community.coverUrl = result.secure_url;
    await community.save();
    res.json(community);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to upload cover' });
  }
});

// --- Community folders ---

async function hasSiblingWithSameName(communityId, parentId, name, excludeFolderId = null) {
  const escaped = (name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = {
    communityId,
    name: { $regex: new RegExp(`^${escaped}$`, 'i') },
    parentId: parentId == null || parentId === '' ? null : parentId,
  };
  if (excludeFolderId) filter._id = { $ne: excludeFolderId };
  const existing = await CommunityFolder.findOne(filter);
  return !!existing;
}

async function isDescendantOf(descendantId, ancestorId, communityId) {
  let current = await CommunityFolder.findOne({ _id: descendantId, communityId });
  while (current) {
    if (String(current._id) === String(ancestorId)) return true;
    current = current.parentId
      ? await CommunityFolder.findOne({ _id: current.parentId, communityId })
      : null;
  }
  return false;
}

router.get('/:communityId/folders', async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const folders = await CommunityFolder.find({ communityId: community._id }).sort({ order: 1, createdAt: 1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list folders' });
  }
});

router.post('/:communityId/folders', async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    if (await hasSiblingWithSameName(community._id, null, String(name).trim())) {
      return res.status(400).json({
        message: 'A folder with this name already exists. Please choose a different name.',
      });
    }
    const folder = await CommunityFolder.create({
      name: String(name).trim(),
      communityId: community._id,
      parentId: null,
    });
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create folder' });
  }
});

router.put('/:communityId/folders/:folderId', async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const folder = await CommunityFolder.findOne({
      _id: req.params.folderId,
      communityId: community._id,
    });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    const { name } = req.body;
    if (name !== undefined) folder.name = String(name).trim() || folder.name;
    folder.parentId = null;
    if (await hasSiblingWithSameName(community._id, null, folder.name, folder._id)) {
      return res.status(400).json({
        message: 'A folder with this name already exists in this location. Please choose a different name.',
      });
    }
    await folder.save();
    res.json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update folder' });
  }
});

router.delete('/:communityId/folders/:folderId', async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const folder = await CommunityFolder.findOne({
      _id: req.params.folderId,
      communityId: community._id,
    });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    await CommunityFolder.updateMany(
      { parentId: folder._id },
      { parentId: folder.parentId }
    );
    await CommunityFile.updateMany(
      { communityFolderId: folder._id },
      { communityFolderId: folder.parentId }
    );
    await CommunityFolder.deleteOne({ _id: folder._id });
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete folder' });
  }
});

// --- Community files ---

router.get('/:communityId/files', async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const filter = { communityId: community._id };
    const folderId = req.query.communityFolderId;
    if (folderId !== undefined && folderId !== '') {
      filter.communityFolderId = folderId === 'null' ? null : folderId;
    }
    const files = await CommunityFile.find(filter).sort({ createdAt: 1 }).lean();
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list files' });
  }
});

router.post('/:communityId/files', uploadPdf.single('file'), async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!isCloudinaryConfigured) {
      return res.status(503).json({ message: 'File upload is not configured. Configure Cloudinary in server/.env.' });
    }
    const communityFolderId = req.body.communityFolderId || null;
    if (communityFolderId) {
      const folder = await CommunityFolder.findOne({
        _id: communityFolderId,
        communityId: community._id,
      });
      if (!folder) return res.status(400).json({ message: 'Folder not found' });
    }
    const cloudFolder = `${CLOUDINARY_FOLDER}/communities/${community._id}`;
    const result = await uploadBufferToCloudinary(
      req.file.buffer,
      req.file.mimetype,
      cloudFolder
    );
    const title = (req.body.title || req.file.originalname || 'Untitled').trim() || 'Untitled';
    const file = await CommunityFile.create({
      title,
      originalName: req.file.originalname || '',
      fileName: result.public_id,
      fileUrl: result.secure_url,
      mimeType: req.file.mimetype || 'application/pdf',
      size: req.file.size ?? null,
      communityId: community._id,
      communityFolderId: communityFolderId || null,
    });
    res.status(201).json(file);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to upload file' });
  }
});

router.delete('/:communityId/files/:fileId', async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const file = await CommunityFile.findOne({
      _id: req.params.fileId,
      communityId: community._id,
    });
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.fileUrl) {
      try {
        await destroyCloudinaryAsset(file.fileName, getResourceType(file.mimeType));
      } catch {}
    }
    await CommunityFile.deleteOne({ _id: file._id });
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete file' });
  }
});

export default router;
