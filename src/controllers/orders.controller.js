import { Order } from '../models/order.model.js';
import { PickupWindow } from '../models/pickupWindow.model.js';
import { MenuItem } from '../models/menuItem.model.js';
import logger from '../config/logger.js';
import { AppError } from '../middlewares/error.js';

const CANCEL_MIN = Number(process.env.ORDER_CANCEL_MINUTES || 30);

// ---------- Helpers ----------
function assertObjectId(id, name='id') {
  if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', `Invalid ${name}`, 400);
}

function computeTotals(items) {
  const subtotal = items.reduce((s, it) => s + (it.priceCents * it.quantity), 0);
  const discount = 0; // placeholder for future passes/coupons
  const total = Math.max(0, subtotal - discount);
  return { subtotalCents: subtotal, discountCents: discount, totalCents: total };
}

function canCustomerCancel(now, startAt) {
  return now.getTime() <= (new Date(startAt).getTime() - CANCEL_MIN * 60 * 1000);
}

const allowedTransitions = new Map([
  ['CONFIRMED', new Set(['IN_PREP','CANCELLED'])],
  ['IN_PREP',   new Set(['READY'])],
  ['READY',     new Set(['PICKED_UP'])],
  ['PICKED_UP', new Set([])],
  ['CANCELLED', new Set([])]
]);

function ensureTransition(from, to) {
  const nexts = allowedTransitions.get(from) || new Set();
  if (!nexts.has(to)) {
    throw new AppError('VALIDATION_ERROR', `Illegal status transition ${from} → ${to}`, 400);
  }
}

// ---------- Controllers ----------

// POST /orders  (customer)
export async function create(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const { pickupWindowId, items, notes } = req.body || {};
    assertObjectId(pickupWindowId, 'pickupWindowId');

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'items array is required', 400);
    }
    // items: [{ menuItemId, quantity }]
    const normalizedItems = items.map((it, idx) => {
      assertObjectId(it?.menuItemId, `items[${idx}].menuItemId`);
      const qty = Number(it?.quantity ?? 1);
      if (!Number.isFinite(qty) || qty < 1 || qty > 100) {
        throw new AppError('VALIDATION_ERROR', `items[${idx}].quantity must be 1..100`, 400);
      }
      return { menuItemId: it.menuItemId, quantity: qty, variants: Array.isArray(it.variants) ? it.variants : [] };
    });

    // 1) Fetch & atomically reserve capacity on window
    const now = new Date();
    const window = await PickupWindow.findOneAndUpdate(
      {
        _id: pickupWindowId,
        status: 'open',
        isActive: true,
        isDeleted: false,
        // valid time window (allow placing orders until window start?)
        startAt: { $gte: now }
      },
      {
        // optimistic capacity check: only inc if bookedCount < capacity
        $inc: { bookedCount: 1 }
      },
      {
        new: true
      }
    ).lean();

    if (!window) {
      // Either not found/open/active or time invalid; or capacity might be exceeded.
      // Double-check capacity to craft accurate error:
      const w2 = await PickupWindow.findById(pickupWindowId).lean();
      if (!w2) throw new AppError('NOT_FOUND', 'Pickup window not found', 404);
      if (w2.isDeleted || !w2.isActive || w2.status !== 'open') {
        throw new AppError('CONFLICT', 'Pickup window not open/active', 409);
      }
      if (new Date(w2.startAt) < now) throw new AppError('CONFLICT', 'Pickup window already started', 409);
      // capacity check (non-atomic message)
      if ((w2.bookedCount ?? 0) >= (w2.capacity ?? 0)) {
        throw new AppError('CONFLICT', 'Pickup window is full', 409);
      }
      // Fallback:
      throw new AppError('CONFLICT', 'Unable to reserve capacity', 409);
    }

    if ((window.bookedCount ?? 0) > (window.capacity ?? 0)) {
      // Extremely rare race; roll back decrement and fail
      await PickupWindow.updateOne({ _id: window._id }, { $inc: { bookedCount: -1 } });
      throw new AppError('CONFLICT', 'Pickup window over capacity', 409);
    }

    // 2) Load menu items & snapshot
    const ids = normalizedItems.map(i => i.menuItemId);
    const menuDocs = await MenuItem.find({ _id: { $in: ids }, isActive: true, isDeleted: { $ne: true } })
      .select('_id name priceCents')
      .lean();

    if (menuDocs.length !== ids.length) {
      await PickupWindow.updateOne({ _id: window._id }, { $inc: { bookedCount: -1 } });
      throw new AppError('VALIDATION_ERROR', 'Some menu items are not available', 400);
    }

    const itemMap = new Map(menuDocs.map(d => [String(d._id), d]));
    const snapshot = normalizedItems.map(it => {
      const doc = itemMap.get(String(it.menuItemId));
      return {
        menuItemId: doc._id,
        name: doc.name,
        priceCents: doc.priceCents,
        quantity: it.quantity,
        variants: it.variants
      };
    });

    const totals = computeTotals(snapshot);

    // 3) Create order
    const order = await Order.create({
      customerId,
      pickupWindowId,
      items: snapshot,
      ...totals,
      status: 'CONFIRMED',
      notes: typeof notes === 'string' ? notes.slice(0, 300) : '',
      windowStartAt: window.startAt,
      windowEndAt: window.endAt
    });

    logger.info({ msg: 'order_created', orderId: order._id.toString(), customerId, pickupWindowId });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

// GET /orders/me (customer)
export async function listMine(req, res, next) {
  try {
    const customerId = req.auth?.userId;
    if (!customerId) throw new AppError('UNAUTHORIZED', 'Authentication required', 401);

    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const status = req.query.status;

    const filter = { customerId };
    if (status && typeof status === 'string') {
      filter.status = status;
    }

    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      Order.countDocuments(filter)
    ]);

    res.json({ items, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

// PATCH /orders/:id/status  (host; or customer cancelling own order if policy allows)
export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    assertObjectId(id);

    const { status } = req.body || {};
    if (typeof status !== 'string') throw new AppError('VALIDATION_ERROR', 'status is required', 400);

    const order = await Order.findById(id);
    if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404);

    const isHost = req.auth?.role === 'host';
    const isOwner = String(order.customerId) === String(req.auth?.userId);

    // Customer can only request CANCELLED from CONFIRMED and only within policy
    if (!isHost) {
      if (!(isOwner && order.status === 'CONFIRMED' && status === 'CANCELLED' && canCustomerCancel(new Date(), order.windowStartAt))) {
        throw new AppError('FORBIDDEN', 'Insufficient permissions to change status', 403);
      }
    } else {
      // Host transitions: enforce allowed transitions
      ensureTransition(order.status, status);
    }

    // If cancelling a CONFIRMED order → free capacity
    const freeingCapacity = (order.status === 'CONFIRMED' && status === 'CANCELLED');

    order.status = status;
    if (status === 'CANCELLED') {
      order.cancelledAt = new Date();
      order.cancelledBy = isHost ? 'host' : 'customer';
    }
    await order.save();

    if (freeingCapacity) {
      await PickupWindow.updateOne(
        { _id: order.pickupWindowId, bookedCount: { $gt: 0 } },
        { $inc: { bookedCount: -1 } }
      );
    }

    logger.info({ msg: 'order_status_changed', orderId: id, to: status, by: isHost ? 'host' : 'customer' });
    res.json(order);
  } catch (err) {
    next(err);
  }
}
