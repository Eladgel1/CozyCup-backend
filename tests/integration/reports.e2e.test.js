import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

const REPORTS_BASE = '/reports/day-summary';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_reports_e2e';
      return url.toString();
    } catch {
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host) => `//${host}/cozycup_reports_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_reports_e2e';
}

const TEST_URI = makeTestUri();

describe('Reports E2E', () => {
  let hostAccess, customerAccess;

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // Register and login host
    const hostEmail = 'host-reports@example.com';
    const pass = 'P@ssword123';
    await request(app).post('/auth/register').send({ email: hostEmail, password: pass }).expect(201);
    await mongoose.connection.db.collection('users')
      .updateOne({ email: hostEmail }, { $set: { role: 'host' } });
    const hostLogin = await request(app).post('/auth/login').send({ email: hostEmail, password: pass }).expect(200);
    hostAccess = hostLogin.body.tokens.accessToken;

    // Register customer
    await request(app).post('/auth/register').send({ email: 'cust-reports@example.com', password: pass }).expect(201);
    const custLogin = await request(app).post('/auth/login').send({ email: 'cust-reports@example.com', password: pass }).expect(200);
    customerAccess = custLogin.body.tokens.accessToken;

    // אפשר להוסיף כאן יצירת סלוטים, הזמנות ורכישות כדי שיהיה תוכן לדוח
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('GET /reports/day-summary returns structure for host', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app)
      .get(`${REPORTS_BASE}?date=${today}`)
      .set('Authorization', `Bearer ${hostAccess}`)
      .expect(200);

    expect(res.body).toHaveProperty('date');
    expect(res.body).toHaveProperty('bookings');
    expect(res.body).toHaveProperty('slots');
    expect(res.body).toHaveProperty('purchases');
    expect(typeof res.body.redemptions).toBe('number');
  });

  test('GET /reports/day-summary should fail for customer', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await request(app)
      .get(`${REPORTS_BASE}?date=${today}`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(403);
  });
});
