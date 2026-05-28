import express from 'express';
import CommunitySpace from '../models/CommunitySpace.js';
import Note from '../models/Note.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/community-spaces - Get all community spaces with their topics and approved notes
router.get('/', async (req, res) => {
  try {
    const spaces = await CommunitySpace.find().sort({ createdAt: 1 }).lean();
    
    // Fetch all approved notes that belong to any community space
    const notes = await Note.find({
      status: 'approved',
      communitySpaceId: { $in: spaces.map(s => s._id) }
    }).populate('userId', 'name picture').lean();

    // Map notes to their respective spaces and topics
    const spacesWithData = spaces.map(space => {
      const spaceNotes = notes.filter(n => n.communitySpaceId.toString() === space._id.toString());
      
      const topicsData = (space.topics || []).map(topicTitle => {
        return {
          id: topicTitle,
          title: topicTitle,
          notes: spaceNotes.filter(n => n.communityTopic === topicTitle)
        };
      });

      // Add 'Other' topic if not present
      if (!topicsData.find(t => t.title.toLowerCase() === 'other')) {
        const otherNotes = spaceNotes.filter(n => !(space.topics || []).includes(n.communityTopic));
        topicsData.push({
          id: 'Other',
          title: 'Other',
          notes: otherNotes
        });
      } else {
        // If 'Other' already exists, make sure it catches any unmapped notes too
        const otherTopic = topicsData.find(t => t.title.toLowerCase() === 'other');
        const unmappedNotes = spaceNotes.filter(n => !(space.topics || []).includes(n.communityTopic) && n.communityTopic.toLowerCase() !== 'other');
        if (unmappedNotes.length > 0) {
          otherTopic.notes.push(...unmappedNotes);
        }
      }

      return {
        id: space._id,
        name: space.name,
        code: space.code,
        icon: space.icon,
        description: space.description,
        topics: topicsData,
        category: space.category || 'General',
        color: space.color || 'from-indigo-600 to-purple-600',
        tags: space.tags || [],
        rules: space.rules || [],
        members: space.members || [],
        membersCount: space.membersCount || 0
      };
    });

    res.json(spacesWithData);
  } catch (err) {
    console.error('[communityRoutes] GET / error:', err);
    res.status(500).json({ message: 'Failed to load community spaces' });
  }
});

// GET /api/community-spaces/top-contributors
router.get('/top-contributors', async (req, res) => {
  try {
    const topContributors = await Note.aggregate([
      { $match: { status: 'approved', communitySpaceId: { $ne: null } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { _id: 1, count: 1, 'user.name': 1, 'user.picture': 1 } }
    ]);
    res.json(topContributors.map(t => ({
      _id: t._id,
      name: t.user.name,
      picture: t.user.picture,
      contributions: t.count
    })));
  } catch (err) {
    console.error('[communityRoutes] /top-contributors error:', err);
    res.status(500).json({ message: 'Failed to load top contributors' });
  }
});

// POST /api/community-spaces/:id/toggle-join
router.post('/:id/toggle-join', authMiddleware, async (req, res) => {
  try {
    const space = await CommunitySpace.findById(req.params.id);
    if (!space) return res.status(404).json({ message: 'Community space not found' });

    const userId = req.user._id;
    const isMember = space.members.includes(userId);

    if (isMember) {
      space.members.pull(userId);
    } else {
      space.members.push(userId);
    }
    
    space.membersCount = space.members.length;
    await space.save();

    res.json({ membersCount: space.membersCount, isJoined: !isMember });
  } catch (err) {
    console.error('[communityRoutes] /toggle-join error:', err);
    res.status(500).json({ message: 'Failed to toggle join status' });
  }
});

export default router;
