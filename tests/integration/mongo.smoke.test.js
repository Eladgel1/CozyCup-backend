import './setup.mongo-memory.js'; // spins up in-memory Mongo & sets MONGO_URI
import { connectMongo, disconnectMongo } from '../../src/config/mongo.js';
import { MenuItem } from '../../src/models/menuItem.model.js';

beforeAll(async () => {
  await connectMongo(); // uses the in-memory URI from setup
});

afterAll(async () => {
  await disconnectMongo();
});

test('can create a MenuItem', async () => {
  const doc = await MenuItem.create({ name: 'Espresso', priceCents: 900, isActive: true });
  expect(doc._id).toBeDefined();
  expect(doc.name).toBe('Espresso');
});
