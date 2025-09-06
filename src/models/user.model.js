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
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['host', 'customer'], default: 'customer', index: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },

    // Refresh token state (for rotation/logout)
    refreshTokenHash: { type: String, default: null, select: false },
    refreshTokenExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Unique email index
UserSchema.index({ email: 1 }, { unique: true });

// Helper for hashing a plain password
export function hashPassword(plain, rounds = 12, pepper = '') {
  const candidate = plain + (pepper || '');
  return bcrypt.hash(candidate, rounds);
}

// Instance method to compare password
UserSchema.methods.comparePassword = function (plain, pepper = '') {
  const candidate = plain + (pepper || '');
  return bcrypt.compare(candidate, this.passwordHash);
};

const User = mongoose.model('User', UserSchema);
export default User;

