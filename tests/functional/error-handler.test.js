import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { errorHandler } from '../../src/middlewares/error.js';

const app = express();
app.get('/boom', () => {
  throw new Error('Test error');
});
app.use(errorHandler);

describe('Global Error Handler', () => {
  let consoleSpy;

  beforeAll(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  test('should return JSON with error details', async () => {
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.message).toMatch(/Test error/);
  });
});
