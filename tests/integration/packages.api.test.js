import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';

const BASE = '/packages';

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_packages_e2e';
      return url.toString();
    } catch {
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host) => `//${host}/cozycup_packages_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_packages_e2e';
}
const TEST_URI = makeTestUri();

describe('Packages E2E (public list + host create)', () => {
  let hostAccess;

  const emailHost = 'h-packages@example.com';
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
    const login = await request(app)
      .post('/auth/login')
      .send({ email: emailHost, password })
      .expect(200);
    hostAccess = login.body.tokens.accessToken;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('GET /packages should return empty list initially', async () => {
    const res = await request(app).get(BASE).expect(200);
    expect(Array.isArray(res.body.items) || Array.isArray(res.body)).toBe(true);
  });

  test('Host can create package and it appears in GET list', async () => {
    const created = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ name: '10 Coffees', credits: 10, price: 100 })
      .expect(201);

    expect(created.body.name).toBe('10 Coffees');
    expect(created.body.credits).toBe(10);

    const list = await request(app).get(BASE).expect(200);
    const items = list.body.items ?? list.body;
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('10 Coffees');
  });
});
