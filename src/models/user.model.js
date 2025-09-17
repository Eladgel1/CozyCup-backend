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
      trim: true,
    },
    // keep selected by default; middleware below ensures it's present in findOne (e.g., login)
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['host', 'customer'], default: 'customer', index: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },

    // Refresh token state (for rotation/logout)
    refreshTokenHash: { type: String, default: null, select: false },
    refreshTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Unique email index
UserSchema.index({ email: 1 }, { unique: true });

// Ensure passwordHash is always available for credential checks that use findOne (e.g., login)
UserSchema.pre('findOne', function (next) {
  // Ensure passwordHash is included even if a projection was set elsewhere
  this.select('+passwordHash');
  next();
});

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
