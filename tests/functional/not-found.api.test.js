import request from 'supertest';
const app = (await import('../../src/app.js')).default;

describe('functional/404', () => {
  test('unknown route → 404 JSON', async () => {
    const res = await request(app).get('/__definitely_not_exists__').expect(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
