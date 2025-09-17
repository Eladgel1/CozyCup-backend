import mongoose from 'mongoose';
import { MenuItem } from '../../src/models/menuItem.model.js';
import { PickupWindow } from '../../src/models/pickupWindow.model.js';
import { Slot } from '../../src/models/slot.model.js';
import { Package } from '../../src/models/package.model.js';
import User from '../../src/models/user.model.js';
import { runSeed } from '../../src/seed/seed.js';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_seed_e2e';
      return url.toString();
    } catch {
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host) => `//${host}/cozycup_seed_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_seed_e2e';
}

const TEST_URI = makeTestUri();

describe('Seed Script E2E', () => {
  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('runs seed and populates base collections', async () => {
    await runSeed();

    const [menuCount, pickupCount, slotCount, pkgCount, userCount] = await Promise.all([
      MenuItem.countDocuments(),
      PickupWindow.countDocuments(),
      Slot.countDocuments(),
      Package.countDocuments(),
      User.countDocuments(),
    ]);

    // Minimal assertions (adjust numbers if your seed inserts specific counts)
    expect(menuCount).toBeGreaterThanOrEqual(8);
    expect(pickupCount).toBeGreaterThanOrEqual(4);
    expect(slotCount).toBeGreaterThanOrEqual(6);
    expect(pkgCount).toBeGreaterThanOrEqual(2);
    expect(userCount).toBeGreaterThanOrEqual(3);
  });

  test('idempotent seed (second run does not duplicate data)', async () => {
    const beforeCounts = await MenuItem.countDocuments();
    await runSeed();
    const afterCounts = await MenuItem.countDocuments();
    expect(afterCounts).toBe(beforeCounts); // still same amount → no duplicates created
  });
});
