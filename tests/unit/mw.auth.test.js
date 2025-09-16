import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/utils/jwt.js', () => ({
  verifyAccessToken: jest.fn(),
}));

const { authenticate, requireRole } = await import('../../src/middlewares/auth.js');
const jwtUtil = await import('../../src/utils/jwt.js');

describe('middleware/authenticate', () => {
  let req;
  const res = {};
  const next = jest.fn();

  beforeEach(() => {
    req = { headers: {} };
    jwtUtil.verifyAccessToken.mockReset();
    next.mockReset();
  });

  test('fail if Authorization missing', () => {
    authenticate(req, res, (err) => {
      expect(err.statusCode ?? err.status).toBe(401);
    });
  });

  test('sets req.auth on valid token', () => {
    req.headers.authorization = 'Bearer token123';
    jwtUtil.verifyAccessToken.mockReturnValue({ sub: 'u1', role: 'host', jti: 'x' });
    authenticate(req, res, next);
    expect(req.auth.userId).toBe('u1');
    expect(next).toHaveBeenCalled();
  });

  test('throws 401 on invalid token', () => {
    req.headers.authorization = 'Bearer bad';
    jwtUtil.verifyAccessToken.mockImplementation(() => {
      throw new Error('bad token');
    });
    authenticate(req, res, (err) => {
      expect(err.statusCode ?? err.status).toBe(401);
    });
  });
});

describe('middleware/requireRole', () => {
  const res = {};
  const next = jest.fn();

  beforeEach(() => next.mockReset());

  test('throws 403 if role mismatch', () => {
    const req = { auth: { role: 'customer' } };
    const mw = requireRole('host');
    mw(req, res, (err) => {
      expect(err.statusCode ?? err.status).toBe(403);
    });
  });

  test('calls next if role matches', () => {
    const req = { auth: { role: 'host' } };
    const mw = requireRole('host');
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
