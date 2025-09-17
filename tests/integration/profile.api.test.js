import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

const BASE = '/auth';

// Create a dedicated test DB URI (mirrors style from the existing auth tests)
function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;

  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_profile_e2e';
      return url.toString();
    } catch {
      const replaced = envUri.replace(
        /\/\/([^/]+)\/([^?]+)/,
        (_m, host) => `//${host}/cozycup_profile_e2e`
      );
      return replaced;
    }
  }
  return 'mongodb://localhost:27017/cozycup_profile_e2e';
}

const TEST_URI = makeTestUri();

describe('User Profile (GET/PATCH/DELETE /auth/me)', () => {
  const email = 'u8@example.com';
  const password = 'P@ssword123';

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('PATCH /auth/me updates name/phone and returns updated user', async () => {
    // register + login
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    const login = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);

    const access = login.body.tokens.accessToken;

    // update name + phone
    const patch = await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${access}`)
      .send({ name: 'Alice Example', phone: '+972-50-123-4567' })
      .expect(200);

    expect(patch.body?.user?.email).toBe(email);
    expect(patch.body?.user?.name).toBe('Alice Example');
    expect(patch.body?.user?.phone).toBe('+972-50-123-4567');

    // fetch profile to ensure persisted
    const me = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${access}`)
      .expect(200);

    expect(me.body?.user?.name).toBe('Alice Example');
    expect(me.body?.user?.phone).toBe('+972-50-123-4567');
  });

  test('PATCH /auth/me rejects unknown fields with 400', async () => {
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    const login = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);

    const access = login.body.tokens.accessToken;

    await request(app)
      .patch(`${BASE}/me`)
      .set('Authorization', `Bearer ${access}`)
      .send({ name: 'Bob', phone: '123', role: 'host', foo: 'bar' }) // role/foo should not be accepted
      .expect(400);
  });

  test('DELETE /auth/me anonymizes and disables account; old refresh cannot be used and future login fails', async () => {
    // register + login
    await request(app).post(`${BASE}/register`).send({ email, password }).expect(201);
    const login = await request(app).post(`${BASE}/login`).send({ email, password }).expect(200);

    const access = login.body.tokens.accessToken;
    const refresh = login.body.tokens.refreshToken;

    // delete (soft + anonymize)
    await request(app).delete(`${BASE}/me`).set('Authorization', `Bearer ${access}`).expect(204);

    // old refresh must now be rejected
    await request(app).post(`${BASE}/refresh`).send({ refreshToken: refresh }).expect(401);

    // logging in with the same credentials must fail (passwordHash was rotated and account flagged)
    await request(app).post(`${BASE}/login`).send({ email, password }).expect(401);
  });
});
