// src/models/user.model.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['host', 'customer'], default: 'customer', index: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true }
  },
  { timestamps: true }
);

// Unique email index (extra safety)
UserSchema.index({ email: 1 }, { unique: true });

// Helper for hashing a plain password (we'll use it in Step 7)
export function hashPassword(plain, rounds = 12, pepper = '') {
  const candidate = plain + (pepper || '');
  return bcrypt.hash(candidate, rounds);
}

// Instance method to compare a plain password with the stored hash
UserSchema.methods.comparePassword = function (plain, pepper = '') {
  const candidate = plain + (pepper || '');
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model('User', UserSchema);
