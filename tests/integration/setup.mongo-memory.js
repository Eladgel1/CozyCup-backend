// Spin up ephemeral MongoDB in-memory for integration tests only.
import { MongoMemoryServer } from 'mongodb-memory-server';
let mem;

beforeAll(async () => {
  mem = await MongoMemoryServer.create({ binary: { version: '6.0.14' } });
  process.env.MONGO_URI = mem.getUri('cozycup_test');
}, 120_000);

afterAll(async () => {
  if (mem) await mem.stop();
}, 60_000);
