import { PickupWindow } from '../models/pickupWindow.model.js';
import logger from '../config/logger.js';
import { AppError } from '../middlewares/error.js';


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
    const from = new Date(q.from);
    if (isNaN(from.getTime())) throw new AppError('VALIDATION_ERROR', 'Invalid from date', 400);
    // window.endAt >= from
    and.push({ endAt: { $gte: from } });
  }
  if (q.to) {
    const to = new Date(q.to);
    if (isNaN(to.getTime())) throw new AppError('VALIDATION_ERROR', 'Invalid to date', 400);
    // window.startAt <= to
    and.push({ startAt: { $lte: to } });
  }

  const query = and.length ? { ...filters, $and: and } : filters;

  // Sorting: by startAt asc then displayOrder asc
  const sort = { startAt: 1, displayOrder: 1 };

  return { limit, offset, query, sort };
}

function validateCreate(body) {
  const errors = [];

  const startAt = new Date(body.startAt);
  const endAt   = new Date(body.endAt);
  const capacity = Number(body.capacity);

  if (!body.startAt || isNaN(startAt.getTime())) errors.push('startAt must be a valid ISO date');
  if (!body.endAt   || isNaN(endAt.getTime()))   errors.push('endAt must be a valid ISO date');
  if (startAt && endAt && startAt >= endAt)      errors.push('startAt must be earlier than endAt');

  if (!Number.isFinite(capacity) || capacity < 0) errors.push('capacity must be a non-negative integer');

  // Optional fields
  const status = body.status ?? 'open';
  if (!['open', 'closed'].includes(status)) errors.push('status must be open|closed');

  if (errors.length) throw new AppError('VALIDATION_ERROR', errors.join('; '), 400);

  return {
    startAt, endAt, capacity,
    status,
    bookedCount: Number.isFinite(Number(body.bookedCount)) ? Number(body.bookedCount) : 0,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    isDeleted: false,
    displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
    notes: typeof body.notes === 'string' ? body.notes.trim() : ''
  };
}

function validatePatch(body) {
  const allowed = new Set([
    'startAt', 'endAt', 'capacity', 'status',
    'isActive', 'isDeleted', 'displayOrder', 'notes'
  ]);
  const payload = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (!allowed.has(k)) continue;
    payload[k] = v;
  }
  if (Object.keys(payload).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'No updatable fields provided', 400);
  }

  if (payload.startAt !== undefined) {
    const d = new Date(payload.startAt);
    if (isNaN(d.getTime())) throw new AppError('VALIDATION_ERROR', 'startAt must be ISO date', 400);
    payload.startAt = d;
  }
  if (payload.endAt !== undefined) {
    const d = new Date(payload.endAt);
    if (isNaN(d.getTime())) throw new AppError('VALIDATION_ERROR', 'endAt must be ISO date', 400);
    payload.endAt = d;
  }
  if (payload.capacity !== undefined) {
    const c = Number(payload.capacity);
    if (!Number.isFinite(c) || c < 0) throw new AppError('VALIDATION_ERROR', 'capacity must be non-negative', 400);
    payload.capacity = c;
  }
  if (payload.status !== undefined) {
    if (!['open', 'closed'].includes(payload.status)) {
      throw new AppError('VALIDATION_ERROR', 'status must be open|closed', 400);
    }
  }
  if (payload.isActive !== undefined)  payload.isActive  = Boolean(payload.isActive);
  if (payload.isDeleted !== undefined) payload.isDeleted = Boolean(payload.isDeleted);
  if (payload.displayOrder !== undefined) {
    const n = Number(payload.displayOrder);
    if (!Number.isFinite(n) || n < -1_000_000 || n > 1_000_000) throw new AppError('VALIDATION_ERROR', 'displayOrder out of range', 400);
    payload.displayOrder = n;
  }
  if (payload.notes !== undefined) {
    payload.notes = String(payload.notes).trim();
    if (payload.notes.length > 300) throw new AppError('VALIDATION_ERROR', 'notes too long (max 300)', 400);
  }

  return payload;
}

// ---------- Controllers ----------

// GET /pickup-windows (public)
export async function listPublic(req, res, next) {
  try {
    const { limit, offset, query, sort } = parseListQuery(req.query);

    const [items, total] = await Promise.all([
      PickupWindow.find(query).sort(sort).skip(offset).limit(limit).lean(),
      PickupWindow.countDocuments(query)
    ]);

    // Derived availability (for clients)
    const mapped = items.map(w => {
      const remaining = Math.max(0, (w.capacity ?? 0) - (w.bookedCount ?? 0));
      return {
        _id: w._id,
        startAt: w.startAt,
        endAt: w.endAt,
        capacity: w.capacity,
        remaining,
        status: w.status,
        displayOrder: w.displayOrder ?? 0,
        notes: w.notes ?? ''
      };
    });

    res.json({ items: mapped, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

// POST /pickup-windows (host)
export async function create(req, res, next) {
  try {
    const doc = validateCreate(req.body);
    const created = await PickupWindow.create(doc);
    logger.info({ msg: 'pickup_window_create', id: created._id.toString(), actorId: req.auth?.userId });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

// PATCH /pickup-windows/:id (host) — edit/close/activate/delete
export async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', 'Invalid id', 400);

    const payload = validatePatch(req.body);

    // sanity: if start/end both present, check ordering here as well
    if (payload.startAt && payload.endAt && payload.startAt >= payload.endAt) {
      throw new AppError('VALIDATION_ERROR', 'startAt must be earlier than endAt', 400);
    }

    const updated = await PickupWindow.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) throw new AppError('NOT_FOUND', 'Pickup window not found', 404);

    logger.info({ msg: 'pickup_window_update', id, actorId: req.auth?.userId, fields: Object.keys(payload) });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
