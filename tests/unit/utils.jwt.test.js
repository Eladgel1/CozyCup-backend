import * as jwtUtil from '../../src/utils/jwt.js';

describe('utils/jwt', () => {
  const payload = { sub: 'user123', role: 'host' };

  test('signAccessToken + verifyAccessToken', () => {
    const { token } = jwtUtil.signAccessToken(payload);
    const decoded = jwtUtil.verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.role).toBe('host');
  });

  test('signRefreshToken + verifyRefreshToken', () => {
    const { token } = jwtUtil.signRefreshToken({ sub: payload.sub });
    const decoded = jwtUtil.verifyRefreshToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.jti).toBeDefined();
  });

  test('verifyAccessToken fails on tampered token', () => {
    const { token } = jwtUtil.signAccessToken(payload);
    const tampered = token.replace(/\..*\./, '.xxx.');
    expect(() => jwtUtil.verifyAccessToken(tampered)).toThrow();
  });

  test('sha256 returns 64-char hex', () => {
    const hash = jwtUtil.sha256('abc');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
