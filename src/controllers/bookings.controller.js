import { Booking } from '../models/booking.model.js';
import { Slot } from '../models/slot.model.js';
import { AppError } from '../middlewares/error.js';
import logger from '../config/logger.js';

const CANCEL_MIN = Number(process.env.BOOKING_CANCEL_MINUTES || 30);

function assertObjectId(id, name = 'id') {
  if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', `Invalid ${name}`, 400);
}

function canCustomerCancel(now, startAt) {
  return now.getTime() <= new Date(startAt).getTime() - CANCEL_MIN * 60 * 1000;
}

// POST /bookings  (customer)
export async function create(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const { slotId, notes } = req.body || {};
    assertObjectId(slotId, 'slotId');

    const now = new Date();
    const slot = await Slot.findOneAndUpdate(
      {
        _id: slotId,
        status: 'open',
        isActive: true,
        isDeleted: false,
        startAt: { $gte: now },
      },
      { $inc: { bookedCount: 1 } },
      { new: true }
    ).lean();

    if (!slot) {
      const s = await Slot.findById(slotId).lean();
      if (!s) throw new AppError('NOT_FOUND', 'Slot not found', 404);
      if (s.isDeleted || !s.isActive || s.status !== 'open')
        throw new AppError('CONFLICT', 'Slot not open/active', 409);
      if (new Date(s.startAt) < now) throw new AppError('CONFLICT', 'Slot already started', 409);
      if ((s.bookedCount ?? 0) >= (s.capacity ?? 0))
        throw new AppError('CONFLICT', 'Slot is full', 409);
      throw new AppError('CONFLICT', 'Unable to reserve capacity', 409);
    }

    if ((slot.bookedCount ?? 0) > (slot.capacity ?? 0)) {
      await Slot.updateOne({ _id: slot._id }, { $inc: { bookedCount: -1 } });
      throw new AppError('CONFLICT', 'Slot over capacity', 409);
    }

    const booking = await Booking.create({
      slotId,
      customerId,
      status: 'BOOKED',
      notes: typeof notes === 'string' ? notes.slice(0, 300) : '',
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
    });

    logger.info({ msg: 'booking_created', bookingId: booking._id.toString(), customerId, slotId });
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
}

// GET /bookings/me (customer)
export async function listMine(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const status = req.query.status;

    const filter = { customerId };
    if (status && typeof status === 'string') filter.status = status;

    const [items, total] = await Promise.all([
      Booking.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      Booking.countDocuments(filter),
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

// PATCH /bookings/:id/cancel  (customer within policy; host always allowed)
export async function cancel(req, res, next) {
  try {
    const { id } = req.params;
    assertObjectId(id);

    const booking = await Booking.findById(id);
    if (!booking) throw new AppError('NOT_FOUND', 'Booking not found', 404);
    if (booking.status !== 'BOOKED') throw new AppError('CONFLICT', 'Booking is not active', 409);

    const isHost = req.auth?.role === 'host';
    const isOwner = String(booking.customerId) === String(req.auth?.userId);

    if (!isHost) {
      if (!(isOwner && canCustomerCancel(new Date(), booking.slotStartAt))) {
        throw new AppError('FORBIDDEN', 'Cannot cancel (policy)', 403);
      }
    }

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancelledBy = isHost ? 'host' : 'customer';
    await booking.save();

    await Slot.updateOne(
      { _id: booking.slotId, bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );

    res.json(booking);
  } catch (err) {
    next(err);
  }
}
