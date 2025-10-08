import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { jest } from '@jest/globals';

jest.setTimeout(180000);

const PKG_BASE = '/packages';
const PURCH_BASE = '/purchase';
const REDEEM_BASE = '/redeem';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_redemptions_e2e';
      return url.toString();
    } catch {
      return envUri.replace(
        /\/\/([^/]+)\/([^?]+)/,
        (_m, host) => `//${host}/cozycup_redemptions_e2e`
      );
    }
  }
  return 'mongodb://localhost:27017/cozycup_redemptions_e2e';
}
const TEST_URI = makeTestUri();

describe('Redemptions API (purchase → redeem)', () => {
  let hostAccess, customerAccess, packageId, purchaseId;
  const emailHost = 'h-redeem@example.com';
  const emailCust = 'c-redeem@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  }, 30000);

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // Host register/login
    await request(app).post('/auth/register').send({ email: emailHost, password }).expect(201);
    const { default: User } = await import('../../src/models/user.model.js');
    await User.findOneAndUpdate({ email: emailHost }, { $set: { role: 'host' } });
    const hostLogin = await request(app)
      .post('/auth/login')
      .send({ email: emailHost, password })
      .expect(200);
    hostAccess = hostLogin.body.tokens.accessToken;

    // Customer register/login
    await request(app).post('/auth/register').send({ email: emailCust, password }).expect(201);
    const custLogin = await request(app)
      .post('/auth/login')
      .send({ email: emailCust, password })
      .expect(200);
    customerAccess = custLogin.body.tokens.accessToken;

    // Host creates package
    const pkg = await request(app)
      .post(PKG_BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ name: '2 Coffees', credits: 2, price: 20 })
      .expect(201);
    packageId = pkg.body._id;

    // Customer purchases package
    const purchase = await request(app)
      .post(PURCH_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ packageId })
      .expect(201);
    purchaseId = purchase.body._id;
  }, 20000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  // Helper: extract readable message
  function extractMessage(body) {
    if (!body) return '';
    if (typeof body === 'string') return body;
    if (typeof body.message === 'string') return body.message;
    if (typeof body.error === 'string') return body.error;
    if (body.error && typeof body.error === 'object') {
      if (typeof body.error.message === 'string') return body.error.message;
      return JSON.stringify(body.error);
    }
    return JSON.stringify(body);
  }

  test('Customer can redeem credit until zero', async () => {
    const r1 = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId })
      .expect(201);
    expect(r1.body.purchaseId).toBe(purchaseId);

    const r2 = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId })
      .expect(201);
    expect(r2.body.purchaseId).toBe(purchaseId);

    await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId })
      .expect(409);
  });

  test('Redeem with missing purchaseId → 400', async () => {
    const res = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({})
      .expect(400);

    const msg = extractMessage(res.body);
    expect(msg.toLowerCase()).toMatch(/purchaseid|token/);
  });

  test('Redeem with invalid purchaseId format → 400', async () => {
    const res = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId: 'not-an-objectid' })
      .expect(400);

    const msg = extractMessage(res.body);
    expect(msg.toLowerCase()).toMatch(/invalid/);
  });

  test('Redeem not owned by user → 404', async () => {
    await request(app)
      .post('/auth/register')
      .send({ email: 'stranger@example.com', password })
      .expect(201);

    const otherLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'stranger@example.com', password })
      .expect(200);
    const strangerAccess = otherLogin.body.tokens.accessToken;

    const res = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${strangerAccess}`)
      .send({ purchaseId })
      .expect(404);

    const msg = extractMessage(res.body);
    expect(msg.toLowerCase()).toMatch(/not|found/);
  });
});
