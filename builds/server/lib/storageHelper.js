import mongoose from 'mongoose';
import Note from '../models/Note.js';

/**
 * Returns total bytes used by a user (sum of Note.size for that userId).
 * Treats null/undefined size as 0.
 * userId can be string or ObjectId.
 */
export async function getUsedStorageBytes(userId) {
  const id = typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  const result = await Note.aggregate([
    { $match: { userId: id } },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$size', 0] } } } },
  ]);
  return result[0]?.total ?? 0;
}
