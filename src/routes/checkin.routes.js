import { Router } from 'express';
import { AppError } from '../middlewares/error.js';
import logger from '../config/logger.js';
import { verifyCheckinToken } from '../utils/qr-token.js';
import { Booking } from '../models/booking.model.js';
import { Slot } from '../models/slot.model.js';

const router = Router();

const EARLY_MIN   = Number(process.env.QR_EARLY_MINUTES || 10);
const LATE_GRACE  = Number(process.env.QR_LATE_GRACE_MINUTES || 30);

// POST /checkin/:token
router.post('/:token', async (req, res, next) => {
  try {
    const raw = req.params.token;
    if (!raw) throw new AppError('VALIDATION_ERROR', 'Missing token', 400);

    // 1) Verify JWT + extract claims
    let payload;
    try {
      payload = verifyCheckinToken(raw);
    } catch (_e) {
      throw new AppError('FORBIDDEN', 'Invalid or expired QR token', 403);
    }

    const bookingId  = String(payload.bid);
    const slotId     = String(payload.sid);
    const customerId = String(payload.sub);

    // 2) Fetch booking & slot
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found', 404);
    if (String(booking.customerId) !== customerId) {
      throw new AppError('FORBIDDEN', 'Token does not match booking customer', 403);
    }
    if (String(booking.slotId) !== slotId) {
      throw new AppError('FORBIDDEN', 'Token does not match booking slot', 403);
    }
    if (booking.status === 'CANCELLED') {
      throw new AppError('CONFLICT', 'Booking has been cancelled', 409);
    }
    if (booking.status === 'CHECKED_IN') {
      // single-use: already consumed
      return res.status(200).json(booking); // idempotent success
    }

    const slot = await Slot.findById(slotId).lean();
    if (!slot || slot.isDeleted || !slot.isActive) {
      throw new AppError('CONFLICT', 'Slot is no longer active', 409);
    }

    // 3) Time policy: allow early/late windows relative to slot start
    const now = new Date();
    const start = new Date(booking.slotStartAt || slot.startAt);
    const end   = new Date(booking.slotEndAt   || slot.endAt);

    const earliest = new Date(start.getTime() - EARLY_MIN * 60 * 1000);
    const latest   = new Date(end.getTime()   + LATE_GRACE * 60 * 1000);

    if (now < earliest || now > latest) {
      throw new AppError(
        'FORBIDDEN',
        `Check-in not allowed at this time (window: -${EARLY_MIN}m .. +${LATE_GRACE}m)`,
        403
      );
    }

    // 4) Atomic state change: BOOKED -> CHECKED_IN
    const updated = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'BOOKED' },
      { $set: { status: 'CHECKED_IN', checkedInAt: now, checkedInBy: 'kiosk' } },
      { new: true }
    );

    if (!updated) {
      // state changed concurrently, treat as conflict
      throw new AppError('CONFLICT', 'Booking is not in BOOKED state', 409);
    }

    logger.info({ msg: 'booking_checked_in', bookingId, slotId });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
