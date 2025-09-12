import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

const SLOT_BASE = '/slots';
const BOOK_BASE = '/bookings';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_bookings_e2e';
      return url.toString();
    } catch {
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host, _db) => `//${host}/cozycup_bookings_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_bookings_e2e';
}

const TEST_URI = makeTestUri();

describe('Bookings E2E (book → listMine → cancel)', () => {
  let hostAccess, customerAccess, slotId;

  const emailHost = 'h-bookings@example.com';
  const emailCust = 'c-bookings@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // Host
    await request(app).post('/auth/register').send({ email: emailHost, password }).expect(201);
    const { default: User } = await import('../../src/models/user.model.js');
    await User.findOneAndUpdate({ email: emailHost }, { $set: { role: 'host' } });
    const loginHost = await request(app).post('/auth/login').send({ email: emailHost, password }).expect(200);
    hostAccess = loginHost.body.tokens.accessToken;

    // Customer
    await request(app).post('/auth/register').send({ email: emailCust, password }).expect(201);
    const loginCust = await request(app).post('/auth/login').send({ email: emailCust, password }).expect(200);
    customerAccess = loginCust.body.tokens.accessToken;

    // Create a slot
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const slot = await request(app)
      .post(SLOT_BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt, endAt, capacity: 1, status: 'open' })
      .expect(201);
    slotId = slot.body._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('POST /bookings books slot, GET /bookings/me returns it, PATCH /bookings/:id/cancel cancels', async () => {
    const booking = await request(app)
      .post(BOOK_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ slotId })
      .expect(201);

    expect(booking.body.slotId).toBe(slotId);
    expect(booking.body.status).toBe('BOOKED');

    const me = await request(app)
      .get(`${BOOK_BASE}/me`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);

    expect(Array.isArray(me.body.items)).toBe(true);
    expect(me.body.items.length).toBe(1);

    const cancel = await request(app)
      .patch(`${BOOK_BASE}/${booking.body._id}/cancel`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);

    expect(cancel.body.status).toBe('CANCELLED');
  });
});
