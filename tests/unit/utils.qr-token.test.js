import { signCheckinToken, verifyCheckinToken } from '../../src/utils/qr-token.js';

describe('utils/qr-token', () => {
  const payload = { bookingId: 'b1', slotId: 's1', customerId: 'c1' };

  test('sign & verify check-in token', () => {
    const { token } = signCheckinToken(payload);
    const decoded = verifyCheckinToken(token);

    console.log('Decoded checkin token:', decoded);

    expect(decoded.bid).toBe(payload.bookingId);
    expect(decoded.sid).toBe(payload.slotId);
    expect(decoded.sub).toBe(payload.customerId);
    expect(decoded.typ).toBe('checkin');
  });

  test('decoded token contains expected metadata', () => {
    const { token } = signCheckinToken(payload);
    const decoded = verifyCheckinToken(token);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('aud', 'cozycup-kiosk');
    expect(decoded).toHaveProperty('iss', 'cozycup-qr');
  });

  test('verify on modified typ still returns payload', () => {
    const { token } = signCheckinToken(payload);
    const bad = token.replace('checkin', 'oops');
    const decoded = verifyCheckinToken(bad);
    expect(decoded.typ).toBe('checkin');
  });
});
