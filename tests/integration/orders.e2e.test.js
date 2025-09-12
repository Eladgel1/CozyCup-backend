import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

const BASE = '/orders';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;

  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_orders_e2e';
      return url.toString();
    } catch {
      const replaced = envUri.replace(
        /\/\/([^/]+)\/([^?]+)/,
        (_m, host, _db) => `//${host}/cozycup_orders_e2e`
      );
      return replaced;
    }
  }
  return 'mongodb://localhost:27017/cozycup_orders_e2e';
}

const TEST_URI = makeTestUri();

describe('Orders E2E (create → list → status → cancel)', () => {
  let hostAccess, customerAccess, menuItemId, pickupWindowId, orderId;

  const emailCustomer = 'c1@example.com';
  const emailHost = 'h1@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // 1. register customer + host
    await request(app).post('/auth/register').send({ email: emailCustomer, password }).expect(201);
    const loginCust = await request(app).post('/auth/login').send({ email: emailCustomer, password }).expect(200);
    customerAccess = loginCust.body.tokens.accessToken;

    await request(app).post('/auth/register').send({ email: emailHost, password }).expect(201);
    // elevate role manually
    const { default: User } = await import('../../src/models/user.model.js');
    const hostUser = await User.findOneAndUpdate({ email: emailHost }, { $set: { role: 'host' } }, { new: true });
    const loginHost = await request(app).post('/auth/login').send({ email: emailHost, password }).expect(200);
    hostAccess = loginHost.body.tokens.accessToken;

    // 2. create menu item (host)
    const menuRes = await request(app)
      .post('/menu')
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ name: 'Cappuccino', priceCents: 1200 })
      .expect(201);
    menuItemId = menuRes.body._id;

    // 3. create pickup window (host)
    const startAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const win = await request(app)
      .post('/pickup-windows')
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt, endAt, capacity: 3, status: 'open' })
      .expect(201);
    pickupWindowId = win.body._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('POST /orders creates a confirmed order and reserves capacity', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({
        pickupWindowId,
        items: [{ menuItemId, quantity: 2 }],
        notes: 'no sugar'
      })
      .expect(201);

    expect(res.body.status).toBe('CONFIRMED');
    //expect(res.body.items?.length).toBe(1);
    //expect(res.body.totalCents).toBe(2400);
    orderId = res.body._id;
  });

  test('GET /orders/me returns my orders', async () => {
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ pickupWindowId, items: [{ menuItemId, quantity: 1 }] })
      .expect(201);

    const me = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);

    expect(Array.isArray(me.body.items)).toBe(true);
    expect(me.body.items.length).toBeGreaterThan(0);
  });

  test('PATCH /orders/:id/status host transitions work', async () => {
    const created = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ pickupWindowId, items: [{ menuItemId, quantity: 1 }] })
      .expect(201);

    const oid = created.body._id;

    const r1 = await request(app)
      .patch(`${BASE}/${oid}/status`)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ status: 'IN_PREP' })
      .expect(200);
    expect(r1.body.status).toBe('IN_PREP');

    const r2 = await request(app)
      .patch(`${BASE}/${oid}/status`)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ status: 'READY' })
      .expect(200);
    expect(r2.body.status).toBe('READY');
  });

  test('PATCH /orders/:id/status customer can cancel if within policy', async () => {
    const created = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ pickupWindowId, items: [{ menuItemId, quantity: 1 }] })
      .expect(201);

    const oid = created.body._id;

    const cancel = await request(app)
      .patch(`${BASE}/${oid}/status`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ status: 'CANCELLED' })
      .expect(200);

    expect(cancel.body.status).toBe('CANCELLED');
    expect(cancel.body.cancelledBy).toBe('customer');
  });
});
