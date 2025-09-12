import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

const BASE = '/pickup-windows';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;

  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_pickup_e2e';
      return url.toString();
    } catch {
      const replaced = envUri.replace(
        /\/\/([^/]+)\/([^?]+)/,
        (_m, host, _db) => `//${host}/cozycup_pickup_e2e`
      );
      return replaced;
    }
  }
  return 'mongodb://localhost:27017/cozycup_pickup_e2e';
}

const TEST_URI = makeTestUri();

describe('Pickup Windows E2E (create → list → close)', () => {
  let hostAccess;

  const emailHost = 'host@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // register + elevate host
    await request(app).post('/auth/register').send({ email: emailHost, password }).expect(201);
    const { default: User } = await import('../../src/models/user.model.js');
    await User.findOneAndUpdate({ email: emailHost }, { $set: { role: 'host' } }, { new: true });

    const loginHost = await request(app).post('/auth/login').send({ email: emailHost, password }).expect(200);
    hostAccess = loginHost.body.tokens.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('POST /pickup-windows creates new open window', async () => {
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt, endAt, capacity: 5, status: 'open' })
      .expect(201);

    expect(res.body._id).toBeDefined();
    expect(res.body.status).toBe('open');
    expect(res.body.capacity).toBe(5);
  });

  test('GET /pickup-windows lists only active & open windows', async () => {
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();

    // create window
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt, endAt, capacity: 2, status: 'open' })
      .expect(201);

    const list = await request(app)
      .get(BASE)
      .expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
    expect(list.body.items.length).toBeGreaterThan(0);
    expect(list.body.items[0]).toHaveProperty('startAt');
  });

  test('PATCH /pickup-windows/:id can close window (host)', async () => {
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();

    const created = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt, endAt, capacity: 3, status: 'open' })
      .expect(201);

    const id = created.body._id;

    const patch = await request(app)
      .patch(`${BASE}/${id}`)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ status: 'closed' })
      .expect(200);

    expect(patch.body.status).toBe('closed');

    // ensure no longer appears in GET list
    const list = await request(app).get(BASE).expect(200);
    expect(list.body.items.find(i => i._id === id)).toBeUndefined();
  });
});
