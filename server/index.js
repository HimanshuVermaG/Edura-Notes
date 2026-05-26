import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001;

// CORS: allow origins listed in CLIENT_ORIGIN (comma-separated) or any origin if unset (dev mode)
const rawOrigins = (process.env.CLIENT_ORIGIN || '').trim();
const allowedOrigins = rawOrigins
  ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : null; // null = allow any (local dev)

const corsOptions = {
  origin: allowedOrigins
    ? (origin, cb) => {
        // Allow requests with no origin (curl, mobile apps, same-origin SSR)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight for all routes so CORS headers are
// ALWAYS returned with 200 — critical for Vercel serverless where a crash
// during init would otherwise return 500 with no CORS headers.
app.options('*', cors(corsOptions));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/public', publicRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const isVercel = process.env.VERCEL === '1';

// Cache the mongoose connection promise so serverless cold starts reuse it
let mongoosePromise = null;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  if (!mongoosePromise) {
    mongoosePromise = mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/notes-app'
    );
  }
  await mongoosePromise;
}

if (!isVercel) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
} else {
  // On Vercel: connect lazily per request so the export is ready immediately
  const originalHandler = app.handle.bind(app);
  app.handle = async (req, res, next) => {
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB connection error:', err);
      // Don't crash — let CORS headers be sent, return DB error gracefully
      res.status(503).json({ message: 'Database temporarily unavailable' });
      return;
    }
    originalHandler(req, res, next);
  };
}

// Export for Vercel serverless
export default app;
