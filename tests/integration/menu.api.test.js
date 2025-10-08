import './setup.mongo-memory.js';
import request from 'supertest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { MenuItem } from '../../src/models/menuItem.model.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { jest } from '@jest/globals';

jest.setTimeout(180000);

function bearerFor(role = 'host', userId = new mongoose.Types.ObjectId().toString()) {
  const { token } = signAccessToken({ sub: userId, role, jti: crypto.randomUUID() });
  return `Bearer ${token}`;
}

describe('API /menu', () => {
  beforeEach(async () => {
    await MenuItem.deleteMany({});
  });

  test('GET /menu returns sanitized public list', async () => {
    await MenuItem.create({ name: 'Espresso', category: 'coffee', priceCents: 800 });
    const res = await request(app).get('/menu');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ name: 'Espresso', priceCents: 800 });
  });

  test('POST /menu requires auth (401 without token)', async () => {
    const res = await request(app).post('/menu').send({ name: 'Latte', priceCents: 1000 });
    expect(res.status).toBe(401);
  });

  test('POST /menu (host) creates item', async () => {
    const token = bearerFor('host');
    const payload = { name: 'Latte', priceCents: 1000, category: 'coffee' };
    const res = await request(app).post('/menu').set('Authorization', token).send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Latte', priceCents: 1000 });
  });

  test('PATCH /menu/:id invalid id → 400', async () => {
    const token = bearerFor('host');
    const res = await request(app)
      .patch('/menu/invalid-id')
      .set('Authorization', token)
      .send({ name: 'Updated' });

    expect(res.status).toBe(400);
  });

  test('PATCH /menu/:id not found → 404', async () => {
    const token = bearerFor('host');
    const res = await request(app)
      .patch(`/menu/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', token)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });

  test('PATCH /menu/:id ok', async () => {
    const token = bearerFor('host');
    const created = await MenuItem.create({ name: 'Mocha', priceCents: 1400, category: 'coffee' });

    const res = await request(app)
      .patch(`/menu/${created._id}`)
      .set('Authorization', token)
      .send({ name: 'Mocha Grande' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Mocha Grande');
  });
});
