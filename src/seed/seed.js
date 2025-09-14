import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { menuItems, pickupWindows, slots, packages, users } from './demo-data.js';
import { resetDatabase } from './reset.js';
import { MenuItem } from '../models/menuItem.model.js';
import { PickupWindow } from '../models/pickupWindow.model.js';
import { Slot } from '../models/slot.model.js';
import { Package } from '../models/package.model.js';
import User from '../models/user.model.js';

dotenv.config();

export async function runSeed() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/cozycup_dev';

  // Only connect if no active connection exists
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
  }

  await resetDatabase();

  await MenuItem.insertMany(menuItems);
  console.log(`✅ Inserted ${menuItems.length} menu items`);

  await PickupWindow.insertMany(pickupWindows);
  console.log(`✅ Inserted ${pickupWindows.length} pickup windows`);

  await Slot.insertMany(slots);
  console.log(`✅ Inserted ${slots.length} slots`);

  await Package.insertMany(packages);
  console.log(`✅ Inserted ${packages.length} packages`);

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await User.create({ email: u.email, passwordHash: hash, role: u.role });
  }
  console.log(`✅ Inserted ${users.length} users`);

  // Disconnect only if we opened the connection ourselves AND not in tests
  if (process.env.NODE_ENV !== 'test' && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('✅ Seed completed successfully');
  }
}

// Only run automatically if executed directly from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed().catch((err) => {
    console.error('❌ Seed failed', err);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
  });
}
