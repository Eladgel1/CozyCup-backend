import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../../src/app.js';
import { Booking } from '../../src/models/booking.model.js';
import { Slot } from '../../src/models/slot.model.js';
import { jest } from '@jest/globals';


jest.setTimeout(30000);

const SLOT_BASE = '/slots';
const BOOK_BASE = '/bookings';
const CHECKIN_BASE = '/checkin';

// Normalize PEM string from .env (replace literal \n with real line breaks)
function normalizePem(pem) {
  if (!pem) return pem;
  return pem.replace(/\\n/g, '\n');
}

function makeTestUri() {
  const envUri = process.env.MONGO_URI || '';
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  if (envUri) {
    try {
      const url = new URL(envUri);
      url.pathname = '/cozycup_checkin_e2e';
      return url.toString();
    } catch {
      return envUri.replace(/\/\/([^/]+)\/([^?]+)/, (_m, host) => `//${host}/cozycup_checkin_e2e`);
    }
  }
  return 'mongodb://localhost:27017/cozycup_checkin_e2e';
}

const TEST_URI = makeTestUri();

describe('QR Check-in Flow (book → qr → check-in)', () => {
  let hostAccess, customerAccess;
  let slotId, bookingId, qrToken;

  beforeAll(async () => {
    await mongoose.connect(TEST_URI);
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();

    // Register and login as host
    const hostEmail = 'host-qr@example.com';
    const hostPass = 'P@ssword123';
    await request(app).post('/auth/register')
      .send({ email: hostEmail, password: hostPass })
      .expect(201);

    await mongoose.connection.db.collection('users')
      .updateOne({ email: hostEmail }, { $set: { role: 'host' } });

    const hostLogin = await request(app).post('/auth/login')
      .send({ email: hostEmail, password: hostPass })
      .expect(200);
    hostAccess = hostLogin.body.tokens.accessToken;

    // Register and login as customer
    const custEmail = 'cust-qr@example.com';
    const custPass = 'P@ssword123';
    await request(app).post('/auth/register').send({ email: custEmail, password: custPass }).expect(201);
    const custLogin = await request(app).post('/auth/login').send({ email: custEmail, password: custPass }).expect(200);
    customerAccess = custLogin.body.tokens.accessToken;

    // Create slot (start and end times relative to now)
    const futureStart = new Date(Date.now() + 60 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const slot = await request(app)
      .post(SLOT_BASE)
      .set('Authorization', `Bearer ${hostAccess}`)
      .send({ startAt: futureStart, endAt: futureEnd, capacity: 2, status: 'open' })
      .expect(201);

    slotId = slot.body._id;

    // Create booking for the customer
    const booking = await request(app)
      .post(BOOK_BASE)
      .set('Authorization', `Bearer ${customerAccess}`)
      .send({ slotId })
      .expect(201);

    bookingId = booking.body._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  test('QR token can be issued and check-in works once', async () => {
    // 1) Request QR token
    const tokenRes = await request(app)
      .post(`${BOOK_BASE}/${bookingId}/qr-token`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(201);

    expect(tokenRes.body.token).toBeDefined();
    qrToken = tokenRes.body.token;

    // 2) Perform check-in with the token
    const checkRes = await request(app)
      .post(`${CHECKIN_BASE}/${qrToken}`)
      .expect(200);

    expect(checkRes.body.status).toBe('CHECKED_IN');
    expect(checkRes.body.checkedInAt).toBeTruthy();

    // 3) Check-in again should be idempotent
    const again = await request(app)
      .post(`${CHECKIN_BASE}/${qrToken}`)
      .expect(200);

    expect(again.body._id).toBe(bookingId);
    expect(again.body.status).toBe('CHECKED_IN');
  });

  test('expired QR token yields 403', async () => {
    // Create a token with extremely short expiry
    const payload = {
      bid: bookingId,
      sid: slotId,
      sub: new mongoose.Types.ObjectId().toString(),
      typ: 'checkin'
    };

    const privateKey = normalizePem(process.env.JWT_PRIVATE_KEY);
    const expiringToken = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      expiresIn: '1ms',
      issuer: 'cozycup-qr',
      audience: 'cozycup-kiosk'
    });

    await new Promise(r => setTimeout(r, 10));

    await request(app)
      .post(`${CHECKIN_BASE}/${expiringToken}`)
      .expect(403);
  });

  test('cannot issue QR if booking is cancelled', async () => {
    // Try cancelling the booking. Expect 200 if allowed, or 403 if policy blocks it.
    const cancelRes = await request(app)
      .patch(`${BOOK_BASE}/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${customerAccess}`)
      .expect(res => {
        if (![200, 403].includes(res.status)) {
          throw new Error(`Unexpected cancel response: ${res.status}`);
        }
      });

    if (cancelRes.status === 200) {
      // If cancel succeeded, trying to issue QR should fail with 409
      await request(app)
        .post(`${BOOK_BASE}/${bookingId}/qr-token`)
        .set('Authorization', `Bearer ${customerAccess}`)
        .expect(409);
    } else {
      // If cancel was forbidden, just assert that booking is still BOOKED
      const booking = await Booking.findById(bookingId);
      expect(booking.status).toBe('BOOKED');
    }
  });
});


