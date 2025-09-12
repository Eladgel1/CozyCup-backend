import { Slot } from '../models/slot.model.js';
import { AppError } from '../middlewares/error.js';
import logger from '../config/logger.js';

function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(v, max));
}

function parseListQuery(q) {
  const limit  = clamp(q.limit ?? 100, 1, 200);
  const offset = clamp(q.offset ?? 0, 0, 10_000);

  const includeClosed = String(q.includeClosed || '').toLowerCase() === 'true';
  const filters = { isActive: true, isDeleted: false };
  if (!includeClosed) filters.status = 'open';

  const and = [];
  if (q.from) {
    const d = new Date(q.from);
    if (isNaN(d)) throw new AppError('VALIDATION_ERROR', 'Invalid from date', 400);
    and.push({ endAt: { $gte: d } });
  }
  if (q.to) {
    const d = new Date(q.to);
    if (isNaN(d)) throw new AppError('VALIDATION_ERROR', 'Invalid to date', 400);
    and.push({ startAt: { $lte: d } });
  }
  const query = and.length ? { ...filters, $and: and } : filters;
  const sort = { startAt: 1, displayOrder: 1 };

  return { limit, offset, query, sort };
}

function validateCreate(body) {
  const errors = [];
  const startAt = new Date(body.startAt);
  const endAt   = new Date(body.endAt);
  const capacity = Number(body.capacity);

  if (!body.startAt || isNaN(startAt)) errors.push('startAt must be a valid ISO date');
  if (!body.endAt   || isNaN(endAt))   errors.push('endAt must be a valid ISO date');
  if (startAt && endAt && startAt >= endAt) errors.push('startAt must be earlier than endAt');
  if (!Number.isFinite(capacity) || capacity < 0) errors.push('capacity must be non-negative');

  const status = body.status ?? 'open';
  if (!['open', 'closed'].includes(status)) errors.push('status must be open|closed');

  if (errors.length) throw new AppError('VALIDATION_ERROR', errors.join('; '), 400);

  return {
    startAt, endAt, capacity,
    status,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    isDeleted: false,
    displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
    notes: typeof body.notes === 'string' ? body.notes.trim() : ''
  };
}

// GET /slots (public)
export async function listPublic(req, res, next) {
  try {
    const { limit, offset, query, sort } = parseListQuery(req.query);
    const [items, total] = await Promise.all([
      Slot.find(query).sort(sort).skip(offset).limit(limit).lean(),
      Slot.countDocuments(query)
    ]);

    const mapped = items.map(s => ({
      _id: s._id,
      startAt: s.startAt,
      endAt: s.endAt,
      capacity: s.capacity,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
      status: s.status,
      displayOrder: s.displayOrder ?? 0,
      notes: s.notes ?? ''
    }));

    res.json({ items: mapped, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

// POST /slots (host)
export async function create(req, res, next) {
  try {
    const doc = validateCreate(req.body);
    const created = await Slot.create(doc);
    logger.info({ msg: 'slot_create', id: created._id.toString(), actorId: req.auth?.userId });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}
