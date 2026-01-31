import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

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
  res.json({ user: { ...u, role: u.role || 'user' } });
});

export default router;
