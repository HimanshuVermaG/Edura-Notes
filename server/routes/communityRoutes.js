import express from 'express';
import mongoose from 'mongoose';
import Community from '../models/Community.js';
import CommunityMember from '../models/CommunityMember.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

/** GET /api/communities/:id/joined - whether current user has joined this community */
router.get('/:id/joined', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid community id' });
    }
    const member = await CommunityMember.findOne({
      userId: req.user._id,
      communityId: id,
    });
    res.json({ joined: !!member });
  } catch (err) {
    console.error('[communityRoutes] GET /:id/joined error:', err);
    res.status(500).json({ message: err.message || 'Failed to check membership' });
  }
});

/** POST /api/communities/:id/join - join community */
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid community id' });
    }
    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    const existing = await CommunityMember.findOne({
      userId: req.user._id,
      communityId: id,
    });
    if (existing) {
      return res.json({ joined: true });
    }
    await CommunityMember.create({
      userId: req.user._id,
      communityId: id,
    });
    res.json({ joined: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ joined: true });
    }
    console.error('[communityRoutes] POST /:id/join error:', err);
    res.status(500).json({ message: err.message || 'Failed to join community' });
  }
});

/** DELETE /api/communities/:id/join - leave community */
router.delete('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid community id' });
    }
    await CommunityMember.deleteOne({
      userId: req.user._id,
      communityId: id,
    });
    res.json({ joined: false });
  } catch (err) {
    console.error('[communityRoutes] DELETE /:id/join error:', err);
    res.status(500).json({ message: err.message || 'Failed to leave community' });
  }
});

export default router;
