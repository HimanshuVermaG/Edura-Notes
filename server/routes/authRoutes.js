import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

function toUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    picture: user.picture || '',
  };
}

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential || !GOOGLE_CLIENT_ID) {
      return res.status(400).json({ message: 'Google Sign-In is not configured or credential is missing' });
    }
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Invalid Google token' });
    }
    const googleId = payload.sub;
    const email = (payload.email || '').trim().toLowerCase();
    const name = (payload.name || payload.email || 'User').trim();
    const picture = payload.picture || '';

    let user = await User.findOne({ googleId });
    if (user) {
      if (user.name !== name || user.picture !== picture) {
        user.name = name;
        user.picture = picture;
        await user.save();
      }
    } else {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.name = name;
        user.picture = picture;
        await user.save();
      } else {
        user = await User.create({
          googleId,
          email,
          name,
          picture,
          role: 'user',
        });
      }
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (adminEmail && email === adminEmail && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: toUserResponse(user),
    });
  } catch (err) {
    if (err.message && err.message.includes('Token used too late')) {
      return res.status(401).json({ message: 'Google token expired' });
    }
    res.status(401).json({ message: err.message || 'Google Sign-In failed' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role || 'user' },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Signup failed' });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role || 'user' },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Signin failed' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const u = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete u.password;
  res.json({ user: { ...u, role: u.role || 'user', picture: u.picture || '' } });
});

export default router;
