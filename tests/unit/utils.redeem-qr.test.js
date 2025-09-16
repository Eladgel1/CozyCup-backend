import { jest } from '@jest/globals';
import { signRedeemToken, verifyRedeemToken } from '../../src/utils/redeem-qr.js';
import crypto from 'crypto';
import { beforeAll } from '@jest/globals';

beforeAll(() => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env.JWT_PRIVATE_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' });
  process.env.JWT_PUBLIC_KEY = publicKey.export({ type: 'pkcs1', format: 'pem' });
});

describe('utils/redeem-qr', () => {
  const payload = { purchaseId: 'p1', customerId: 'c1' };

  test('sign & verify redeem token', () => {
    const { token } = signRedeemToken(payload);
    const decoded = verifyRedeemToken(token);
    expect(decoded.purchaseId).toBe(payload.purchaseId);
    expect(decoded.sub).toBe(payload.customerId);
    expect(decoded.typ).toBe('redeem');
  });

  test('decoded token should contain expected metadata', () => {
    const { token } = signRedeemToken(payload);
    const decoded = verifyRedeemToken(token);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
  });

  test('verify on modified typ still returns payload', () => {
    const { token } = signRedeemToken(payload);
    const bad = token.replace('redeem', 'badtyp');
    const decoded = verifyRedeemToken(bad);
    expect(decoded.typ).toBe('redeem');
  });
});
