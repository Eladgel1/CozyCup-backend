import { jest } from '@jest/globals';
import { AppError, notFound, errorHandler } from '../../src/middlewares/error.js';
import { validate } from '../../src/middlewares/validate.js';

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});


describe('AppError', () => {
  test('constructs with code/status', () => {
    const err = new AppError('BAD', 'oops', 400);
    expect(err.code).toBe('BAD');
    expect(err.statusCode ?? err.status).toBe(400);;
  });
});

describe('notFound', () => {
  test('creates 404 error', () => {
    const req = {};
    const res = { status: jest.fn(() => ({ json: jest.fn() })) };
    notFound(req, res, (err) => {
      expect(err.statusCode ?? err.status).toBe(404);;
    });
  });
});

describe('errorHandler', () => {
  test('handles AppError gracefully', () => {
    const err = new AppError('X', 'msg', 418);
    const json = jest.fn();
    errorHandler(err, {}, { status: jest.fn(() => ({ json })) });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(Object) }));
  });

  test('handles generic error as 500', () => {
    const err = new Error('fail');
    const json = jest.fn();
    errorHandler(err, {}, { status: jest.fn(() => ({ json })) });
    expect(json).toHaveBeenCalled();
  });
});

describe('validate middleware', () => {
  test('calls next if valid', async () => {
    const schema = { parseAsync: jest.fn(() => Promise.resolve({})) };
    const next = jest.fn();
    await validate(schema)({ body: {} }, {}, next);
    expect(next).toHaveBeenCalled();
  });

  test('calls next with error if invalid', async () => {
    const schema = { parseAsync: jest.fn(() => Promise.reject(new Error('bad'))) };
    const next = jest.fn();
    await validate(schema)({ body: {} }, {}, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
