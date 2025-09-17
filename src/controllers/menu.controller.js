import { MenuItem } from '../models/menuItem.model.js';
import logger from '../config/logger.js';
import { AppError } from '../middlewares/error.js';

// ---------- Helpers ----------
function clamp(n, min, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(v, max));
}

function parseListQuery(q) {
  const limit = clamp(q.limit ?? 100, 1, 200);
  const offset = clamp(q.offset ?? 0, 0, 10_000);

  const filters = { isActive: true, isDeleted: false };
  if (q.category && typeof q.category === 'string') {
    filters.category = q.category.trim();
  }

  let text = null;
  if (q.q && typeof q.q === 'string' && q.q.trim().length > 0) {
    text = q.q.trim();
  }

  // sort=displayOrder:asc | priceCents:desc | name:asc | createdAt:desc
  const sort = {};
  if (q.sort && typeof q.sort === 'string') {
    const [field, dir] = q.sort.split(':');
    const allowed = new Set(['displayOrder', 'priceCents', 'name', 'createdAt']);
    if (allowed.has(field)) sort[field] = dir === 'desc' ? -1 : 1;
  }
  if (Object.keys(sort).length === 0) {
    sort.displayOrder = 1;
    sort.name = 1;
  }

  return { limit, offset, filters, text, sort };
}

function validateCreatePayload(body) {
  const errors = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const priceCents = Number(body.priceCents);

  if (!name || name.length < 2 || name.length > 80) errors.push('name must be 2-80 chars');
  if (!Number.isFinite(priceCents) || priceCents < 0)
    errors.push('priceCents must be a non-negative integer');
  if (category.length > 40) errors.push('category must be up to 40 chars');

  if (errors.length) throw new AppError('VALIDATION_ERROR', errors.join('; '), 400);

  return {
    name,
    priceCents,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : '',
    category,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    currency:
      typeof body.currency === 'string' && body.currency.length === 3 ? body.currency : 'ILS',
    displayOrder: Number.isFinite(Number(body.displayOrder)) ? Number(body.displayOrder) : 0,
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 15).map(String) : [],
    allergens: Array.isArray(body.allergens) ? body.allergens.slice(0, 15).map(String) : [],
    variants: Array.isArray(body.variants) ? body.variants : [],
    isDeleted: false,
  };
}

function validatePatchPayload(body) {
  const allowed = new Set([
    'name',
    'priceCents',
    'description',
    'imageUrl',
    'category',
    'isActive',
    'currency',
    'displayOrder',
    'tags',
    'allergens',
    'variants',
    'isDeleted',
  ]);

  const payload = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (!allowed.has(k)) continue;
    payload[k] = v;
  }
  if (Object.keys(payload).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'No updatable fields provided', 400);
  }

  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (name.length < 2 || name.length > 80)
      throw new AppError('VALIDATION_ERROR', 'name must be 2-80 chars', 400);
    payload.name = name;
  }
  if (payload.priceCents !== undefined) {
    const v = Number(payload.priceCents);
    if (!Number.isFinite(v) || v < 0)
      throw new AppError('VALIDATION_ERROR', 'priceCents must be non-negative', 400);
    payload.priceCents = v;
  }
  if (payload.category !== undefined) {
    const c = String(payload.category).trim();
    if (c.length > 40)
      throw new AppError('VALIDATION_ERROR', 'category must be up to 40 chars', 400);
    payload.category = c;
  }
  if (payload.currency !== undefined) {
    const cur = String(payload.currency);
    if (cur.length !== 3)
      throw new AppError('VALIDATION_ERROR', 'currency must be 3-letter code', 400);
    payload.currency = cur;
  }
  if (payload.displayOrder !== undefined) {
    const n = Number(payload.displayOrder);
    if (!Number.isFinite(n) || n < -1_000_000 || n > 1_000_000) {
      throw new AppError('VALIDATION_ERROR', 'displayOrder out of range', 400);
    }
    payload.displayOrder = n;
  }
  if (payload.isActive !== undefined) payload.isActive = Boolean(payload.isActive);
  if (payload.isDeleted !== undefined) payload.isDeleted = Boolean(payload.isDeleted);
  if (payload.tags !== undefined && !Array.isArray(payload.tags))
    throw new AppError('VALIDATION_ERROR', 'tags must be array', 400);
  if (payload.allergens !== undefined && !Array.isArray(payload.allergens))
    throw new AppError('VALIDATION_ERROR', 'allergens must be array', 400);
  if (payload.variants !== undefined && !Array.isArray(payload.variants))
    throw new AppError('VALIDATION_ERROR', 'variants must be array', 400);

  return payload;
}

// ---------- Controllers ----------

// GET /menu (public)
export async function listPublic(req, res, next) {
  try {
    const { limit, offset, filters, text, sort } = parseListQuery(req.query);
    const query = text ? { ...filters, $text: { $search: text } } : filters;

    const [items, total] = await Promise.all([
      MenuItem.find(query).sort(sort).skip(offset).limit(limit).lean(),
      MenuItem.countDocuments(query),
    ]);

    // Only client-facing fields
    const sanitized = items.map((i) => ({
      _id: i._id,
      name: i.name,
      description: i.description,
      priceCents: i.priceCents,
      currency: i.currency ?? 'ILS',
      category: i.category ?? '',
      imageUrl: i.imageUrl ?? '',
      isActive: i.isActive === true,
      displayOrder: i.displayOrder ?? 0,
      tags: i.tags ?? [],
      allergens: i.allergens ?? [],
      variants: i.variants ?? [],
    }));

    res.json({ items: sanitized, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

// POST /menu (host)
export async function create(req, res, next) {
  try {
    const doc = validateCreatePayload(req.body);
    const created = await MenuItem.create(doc);
    logger.info({ msg: 'menu_create', itemId: created._id.toString(), actorId: req.auth?.userId });
    res.status(201).json(created);
  } catch (err) {
    if (err?.code === 11000)
      return next(new AppError('CONFLICT', 'Menu item already exists', 409, err.keyValue));
    next(err);
  }
}

// PATCH /menu/:id (host)
export async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!id?.match(/^[a-f\d]{24}$/i)) throw new AppError('VALIDATION_ERROR', 'Invalid id', 400);

    const payload = validatePatchPayload(req.body);
    const updated = await MenuItem.findOneAndUpdate(
      { _id: id },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) throw new AppError('NOT_FOUND', 'Menu item not found', 404);

    logger.info({
      msg: 'menu_update',
      itemId: id,
      actorId: req.auth?.userId,
      fields: Object.keys(payload),
    });
    res.json(updated);
  } catch (err) {
    if (err?.name === 'CastError') return next(new AppError('VALIDATION_ERROR', 'Invalid id', 400));
    next(err);
  }
}
