import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { jest } from '@jest/globals';

jest.setTimeout(30000);

const PKG_BASE = '/packages';
const PURCH_BASE = '/purchase';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_purchases_e2e';
      return url.toString();
    } catch {
      return envUri.replace(
        /\/\/([^/]+)\/([^?]+)/,
        (_m, host) => `//${host}/cozycup_purchases_e2e`
      );
    }
  }
  return 'mongodb://localhost:27017/cozycup_purchases_e2e';
}
const TEST_URI = makeTestUri();

describe('Purchases E2E (purchase → wallet)', () => {
  let hostAccess, customerAccess, packageId;

  const emailHost = 'h-purchases@example.com';
  const emailCust = 'c-purchases@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

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
      .send({ name: '3 Coffees', credits: 3, price: 30 })
      .expect(201);
    packageId = pkg.body._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Customer can purchase package and wallet reflects credits', async () => {
    const purchase = await request(app)
      .post(PURCH_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ packageId })
      .expect(201);

    expect(purchase.body.creditsLeft).toBe(3);

    const wallet = await request(app)
      .get(`${PURCH_BASE}/me/wallet`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(200);

    const items = wallet.body.items ?? wallet.body;
    expect(items.length).toBe(1);
    expect(items[0].creditsLeft).toBe(3);
  });
});
