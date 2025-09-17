import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as ctrl from '../controllers/bookings.controller.js';
import { signCheckinToken } from '../utils/qr-token.js';
import { Booking } from '../models/booking.model.js';
import { validate } from '../middlewares/validate.js';
import { createBookingSchema, cancelBookingSchema } from '../schemas/bookings.schema.js';

const router = Router();

router.post('/', authenticate, validate(createBookingSchema), ctrl.create);

router.get('/me', authenticate, ctrl.listMine);

router.patch('/:id/cancel', authenticate, validate(cancelBookingSchema), ctrl.cancel);

router.post('/:id/qr-token', authenticate, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking)
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });

    if (String(booking.customerId) !== String(req.auth.userId)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not your booking' } });
    }
    if (booking.status !== 'BOOKED') {
      return res
        .status(409)
        .json({ error: { code: 'CONFLICT', message: 'Booking not in BOOKED state' } });
    }

    const { token } = signCheckinToken({
      bookingId: booking._id,
      slotId: booking.slotId,
      customerId: booking.customerId,
    });

    res.status(201).json({ token, exp: process.env.QR_TTL || '10m' });
  } catch (err) {
    next(err);
  }
});

export default router;
