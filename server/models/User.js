import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DEFAULT_STORAGE_LIMIT_BYTES = 50 * 1024 * 1024; // 50 MB

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minLength: 6 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    storageLimitBytes: { type: Number, default: DEFAULT_STORAGE_LIMIT_BYTES, min: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
