import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

await jest.unstable_mockModule('../../src/models/menuItem.model.js', () => ({
  MenuItem: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const menuCtrl = await import('../../src/controllers/menu.controller.js');
const { AppError } = await import('../../src/middlewares/error.js');
const { MenuItem } = await import('../../src/models/menuItem.model.js');

function mockRes() {
  return {
    status: jest.fn(function (c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(),
  };
}

describe('controllers/menu.controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { auth: { userId: 'u1', role: 'host' }, body: {}, params: {}, query: {} };
    res = mockRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('listPublic → returns sanitized items + totals', async () => {
    const items = [
      {
        _id: 'm1',
        name: 'Latte',
        description: 'x',
        priceCents: 120,
        category: 'coffee',
        imageUrl: 'img',
        isActive: true,
        displayOrder: 1,
        tags: ['a'],
        allergens: [],
        variants: [],
        currency: 'ILS',
        isDeleted: false,
      },
    ];

    MenuItem.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve(items),
          }),
        }),
      }),
    });
    MenuItem.countDocuments.mockResolvedValue(1);

    await menuCtrl.listPublic(req, res, next);

    expect(MenuItem.find).toHaveBeenCalledWith({ isActive: true, isDeleted: false });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        total: 1,
        limit: expect.any(Number),
        offset: expect.any(Number),
      })
    );
    const payload = res.json.mock.calls[0][0];
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        _id: 'm1',
        name: 'Latte',
        priceCents: 120,
        isActive: true,
      })
    );
  });

  test('create → success', async () => {
    req.body = { name: 'Mocha', priceCents: 150, category: 'coffee' };
    const created = { _id: 'm2', name: 'Mocha' };
    MenuItem.create.mockResolvedValue(created);

    await menuCtrl.create(req, res, next);

    expect(MenuItem.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mocha', priceCents: 150 })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test('create → duplicate key 11000 → next(AppError 409)', async () => {
    req.body = { name: 'Americano', priceCents: 100 };
    const dup = Object.assign(new Error('dup'), { code: 11000, keyValue: { name: 'Americano' } });
    MenuItem.create.mockRejectedValue(dup);

    await menuCtrl.create(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(409);
  });

  test('update → success (valid id, fields patched)', async () => {
    req.params.id = '507f1f77bcf86cd799439011';
    req.body = { name: 'Cappuccino' };
    const updated = { _id: req.params.id, name: 'Cappuccino' };

    MenuItem.findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve(updated) });

    await menuCtrl.update(req, res, next);

    expect(MenuItem.findOneAndUpdate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test('update → not found → 404', async () => {
    req.params.id = '507f1f77bcf86cd799439011';
    req.body = { name: 'Updated Name' };
    MenuItem.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await menuCtrl.update(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(404);
  });

  test('update → invalid id format → 400', async () => {
    req.params.id = 'bad-id';
    req.body = { name: 'X' };

    await menuCtrl.update(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(400);
  });
});
