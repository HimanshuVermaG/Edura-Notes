import express from 'express';
import Folder from '../models/Folder.js';
import Note from '../models/Note.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user._id };
    const search = (req.query.search || '').trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Case-insensitive search (i flag) on folder name
      filter.name = { $regex: escaped, $options: 'i' };
    }
    const folders = await Folder.find(filter).sort({ order: 1, createdAt: 1 });
    res.json(folders);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to list folders' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Folder name is required' });
    const parent = parentId
      ? await Folder.findOne({ _id: parentId, userId: req.user._id })
      : null;
    if (parentId && !parent) return res.status(400).json({ message: 'Parent folder not found' });
    const folder = await Folder.create({
      name: name.trim(),
      userId: req.user._id,
      parentId: parent ? parent._id : null,
    });
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create folder' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    const { name, parentId } = req.body;
    if (name !== undefined) folder.name = name.trim() || folder.name;
    if (parentId !== undefined) {
      if (parentId === null || parentId === '') {
        folder.parentId = null;
      } else {
        const parent = await Folder.findOne({ _id: parentId, userId: req.user._id });
        if (!parent) return res.status(400).json({ message: 'Parent folder not found' });
        if (String(parent._id) === String(folder._id)) return res.status(400).json({ message: 'Folder cannot be its own parent' });
        const wouldBeCycle = await isDescendantOf(parent._id, folder._id, req.user._id);
        if (wouldBeCycle) return res.status(400).json({ message: 'Cannot move folder inside its own descendant' });
        folder.parentId = parent._id;
      }
    }
    await folder.save();
    res.json(folder);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update folder' });
  }
});

async function isDescendantOf(descendantId, ancestorId, userId) {
  let current = await Folder.findOne({ _id: descendantId, userId });
  while (current) {
    if (String(current._id) === String(ancestorId)) return true;
    current = current.parentId ? await Folder.findOne({ _id: current.parentId, userId }) : null;
  }
  return false;
}

router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    await Folder.updateMany({ parentId: folder._id }, { parentId: folder.parentId });
    await Note.updateMany({ folderId: folder._id }, { folderId: null });
    await Folder.deleteOne({ _id: folder._id });
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to delete folder' });
  }
});

export default router;
