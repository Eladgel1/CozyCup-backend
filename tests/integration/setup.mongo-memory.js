import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mem;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
  const uri = mem.getUri('cozycup_test');
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri, { dbName: 'cozycup_test' });
}, 120_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mem) await mem.stop();
}, 60_000);

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
});
