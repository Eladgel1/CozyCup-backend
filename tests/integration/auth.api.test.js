import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import User from '../../src/models/user.model.js';
import { jest } from '@jest/globals';

jest.setTimeout(180000);

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;

  if (envUri) {
    try {
      const url = new URL(envUri);
      // Force a distinct test DB name regardless of what's in the original URI
      url.pathname = '/cozycup_auth_e2e';
      return url.toString();
    } catch {
      // Fallback string replace (handles mongodb://host:port/db and mongodb+srv)
      const replaced = envUri.replace(
        /\/\/([^/]+)\/([^?]+)/,
        (_m, host) => `//${host}/cozycup_auth_e2e`
      );
      return replaced;
    }
  }
  return 'mongodb://localhost:27017/cozycup_auth_e2e';
}

const TEST_URI = makeTestUri();
const BASE = '/auth';

describe('Auth API flow (register → login → me → refresh (rotation) → logout)', () => {
  const email = 'u1@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    // Clear ONLY the test database, never your dev DB.
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('register returns user + tokens and persists user', async () => {
    const res = await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);

    expect(res.body?.user?.email).toBe(email);
    expect(res.body?.tokens?.accessToken).toBeDefined();
    expect(res.body?.tokens?.refreshToken).toBeDefined();

    const saved = await User.findOne({ email });
    expect(saved).toBeTruthy();
    expect(saved.passwordHash).toBeDefined();
  });

  test('login returns user + tokens (with correct password)', async () => {
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);

    const res = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);

    expect(res.body?.tokens?.accessToken).toBeDefined();
    expect(res.body?.tokens?.refreshToken).toBeDefined();
  });

  test('me requires valid access token', async () => {
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    const login = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);
    const access = login.body.tokens.accessToken;

    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${access}`)
      .expect(200);

    expect(res.body?.user?.email).toBe(email);
    expect(res.body?.user?.id).toBeDefined();
  });

  test('refresh rotates refresh token and invalidates the old one', async () => {
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    const login = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);
    const oldRefresh = login.body.tokens.refreshToken;

    // First refresh — should succeed and rotate token
    const r1 = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: oldRefresh })
      .expect(200);

    const rotated = r1.body.tokens.refreshToken;
    expect(rotated).toBeDefined();
    expect(r1.body.tokens.accessToken).toBeDefined();

    // Using the old refresh again should now fail (rotation in effect)
    await request(app).post(`${BASE}/refresh`).send({ refreshToken: oldRefresh }).expect(401);

    // The rotated one should still work (once)
    await request(app).post(`${BASE}/refresh`).send({ refreshToken: rotated }).expect(200);
  });

  test('logout clears stored refresh and prevents future refresh', async () => {
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    const login = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);
    const access = login.body.tokens.accessToken;
    const refresh = login.body.tokens.refreshToken;

    await request(app).post(`${BASE}/logout`).set('Authorization', `Bearer ${access}`).expect(200);

    // After logout, refresh must be rejected
    await request(app).post(`${BASE}/refresh`).send({ refreshToken: refresh }).expect(401);
  });

  test('login with wrong password returns 401', async () => {
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    await request(app).post(`${BASE}/login`).send({ email, password: 'Wrong#123' }).expect(401);
  });

  test('me without Authorization header returns 401', async () => {
    await request(app).get(`${BASE}/me`).expect(401);
  });
});
