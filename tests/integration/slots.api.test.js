import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { jest } from '@jest/globals';

jest.setTimeout(180000);

const BASE = '/slots';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_slots_e2e';
      return url.toString();
    } catch {
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host) => `//${host}/cozycup_slots_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_slots_e2e';
}

const TEST_URI = makeTestUri();

describe('Slots E2E (create → list)', () => {
  let hostAccess;

  const emailHost = 'h-slots@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // create host & elevate role
    await request(app).post('/auth/register').send({ email: emailHost, password }).expect(201);
    const { default: User } = await import('../../src/models/user.model.js');
    await User.findOneAndUpdate({ email: emailHost }, { $set: { role: 'host' } });
    const loginHost = await request(app)
      .post('/auth/login')
      .send({ email: emailHost, password })
      .expect(200);
    hostAccess = loginHost.body.tokens.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('POST /slots creates a slot and GET /slots lists it', async () => {
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();

    const create = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt, endAt, capacity: 3, status: 'open' })
      .expect(201);

    expect(create.body.capacity).toBe(3);
    expect(create.body.status).toBe('open');

    const list = await request(app).get(`${BASE}?from=${startAt}&to=${endAt}`).expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
    expect(list.body.items.length).toBeGreaterThanOrEqual(1);
  });
});
