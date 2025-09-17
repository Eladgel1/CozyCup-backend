import { Booking } from '../models/booking.model.js';
import { Slot } from '../models/slot.model.js';
import { Purchase } from '../models/purchase.model.js';
import { Redemption } from '../models/redemption.model.js';
import { AppError } from '../middlewares/error.js';

function parseDateParam(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) throw new AppError('VALIDATION_ERROR', 'Invalid date format', 400);
  return d;
}

function getDayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export async function getDaySummary(req, res, next) {
  try {
    const role = req.auth?.role;
    if (role !== 'host') throw new AppError('FORBIDDEN', 'Host role required', 403);

    const dateParam = parseDateParam(req.query.date);
    const { start, end } = getDayRange(dateParam);

    // Bookings counts by status
    const bookings = await Booking.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const bookingsByStatus = bookings.reduce(
      (acc, b) => {
        acc[b._id] = b.count;
        return acc;
      },
      { BOOKED: 0, CHECKED_IN: 0, CANCELLED: 0 }
    );

    // Slot occupancy (for slots starting that day)
    const slots = await Slot.find({ startAt: { $gte: start, $lt: end }, isDeleted: false }).lean();
    const slotSummary = {
      totalSlots: slots.length,
      totalCapacity: slots.reduce((sum, s) => sum + (s.capacity ?? 0), 0),
      totalBooked: slots.reduce((sum, s) => sum + (s.bookedCount ?? 0), 0),
    };

    // Purchases that happened that day
    const purchases = await Purchase.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: null, totalPurchases: { $sum: 1 }, totalCredits: { $sum: '$credits' } } },
    ]);
    const purchaseSummary = purchases[0] || { totalPurchases: 0, totalCredits: 0 };

    // Redemptions that happened that day
    const redemptions = await Redemption.countDocuments({ createdAt: { $gte: start, $lt: end } });

    res.json({
      date: start.toISOString().slice(0, 10),
      bookings: bookingsByStatus,
      slots: slotSummary,
      purchases: purchaseSummary,
      redemptions,
    });
  } catch (err) {
    next(err);
  }
}
