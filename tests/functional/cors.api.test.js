import request from 'supertest';
import app from '../../src/app.js';

describe('CORS', () => {
  test('OPTIONS request should respond with valid CORS preflight', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://127.0.0.1:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect([200, 204]).toContain(res.status);

    expect(res.headers).toHaveProperty('access-control-allow-methods');
    expect(res.headers['access-control-allow-methods']).toMatch(/GET|POST|OPTIONS/);

    if (res.headers['access-control-allow-origin']) {
      expect(res.headers['access-control-allow-origin']).toMatch(/\*|https?:\/\//);
    }
  });
});
