import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

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
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host) => `//${host}/cozycup_redemptions_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_redemptions_e2e';
}
const TEST_URI = makeTestUri();

describe('Redemptions E2E (purchase → redeem)', () => {
  let hostAccess, customerAccess, packageId, purchaseId;

  const emailHost = 'h-redeem@example.com';
  const emailCust = 'c-redeem@example.com';
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
    const hostLogin = await request(app).post('/auth/login').send({ email: emailHost, password }).expect(200);
    hostAccess = hostLogin.body.tokens.accessToken;

    // Customer register/login
    await request(app).post('/auth/register').send({ email: emailCust, password }).expect(201);
    const custLogin = await request(app).post('/auth/login').send({ email: emailCust, password }).expect(200);
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
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('Customer can redeem credit until zero', async () => {
    // 1st redeem
    const r1 = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId })
      .expect(201);
    expect(r1.body.purchaseId).toBe(purchaseId);

    // 2nd redeem should succeed and exhaust credits
    const r2 = await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId })
      .expect(201);
    expect(r2.body.purchaseId).toBe(purchaseId);

    // 3rd redeem should fail with 409
    await request(app)
      .post(REDEEM_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ purchaseId })
      .expect(409);
  });
});
