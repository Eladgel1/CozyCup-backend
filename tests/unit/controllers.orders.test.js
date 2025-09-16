import { jest } from '@jest/globals';

// mock logger early
await jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

// mock models early
await jest.unstable_mockModule('../../src/models/order.model.js', () => ({
  Order: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn()
  }
}));
await jest.unstable_mockModule('../../src/models/pickupWindow.model.js', () => ({
  PickupWindow: {
    findOneAndUpdate: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn()
  }
}));
await jest.unstable_mockModule('../../src/models/menuItem.model.js', () => ({
  MenuItem: {
    find: jest.fn()
  }
}));

const ordersCtrl = await import('../../src/controllers/orders.controller.js');
const { AppError } = await import('../../src/middlewares/error.js');
const { Order } = await import('../../src/models/order.model.js');
const { PickupWindow } = await import('../../src/models/pickupWindow.model.js');
const { MenuItem } = await import('../../src/models/menuItem.model.js');

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    json: jest.fn(),
  };
}

describe('controllers/orders.controller', () => {
  let req, res, next;
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 60 * 1000);

  beforeEach(() => {
    req = { auth: { userId: 'u1', role: 'customer' }, body: {}, params: {}, query: {} };
    res = mockRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('create → success (reserves window, snapshots items, creates order)', async () => {
    req.body = {
      pickupWindowId: '507f1f77bcf86cd799439011',
      items: [{ menuItemId: '507f1f77bcf86cd799439012', quantity: 2 }],
      notes: 'no sugar'
    };

    // window reservation (findOneAndUpdate(...).lean())
    const windowDoc = { _id: 'w1', capacity: 10, bookedCount: 1, startAt: future, endAt: new Date(future.getTime() + 30*60*1000) };
    PickupWindow.findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve(windowDoc) });

    // menu items (find(...).select(...).lean())
    const menuDocs = [{ _id: '507f1f77bcf86cd799439012', name: 'Americano', priceCents: 120 }];
    MenuItem.find.mockReturnValue({
      select: () => ({ lean: () => Promise.resolve(menuDocs) })
    });

    const orderCreated = { _id: 'o1', status: 'CONFIRMED' };
    Order.create.mockResolvedValue(orderCreated);

    await ordersCtrl.create(req, res, next);

    expect(PickupWindow.findOneAndUpdate).toHaveBeenCalled();
    expect(MenuItem.find).toHaveBeenCalled();
    expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
      customerId: 'u1',
      pickupWindowId: '507f1f77bcf86cd799439011',
      status: 'CONFIRMED',
      items: expect.any(Array),
      subtotalCents: expect.any(Number),
      totalCents: expect.any(Number),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(orderCreated);
    expect(next).not.toHaveBeenCalled();
  });

  test('create → window not found/open → derives 409 from follow-up checks', async () => {
    req.body = {
      pickupWindowId: '507f1f77bcf86cd799439011',
      items: [{ menuItemId: '507f1f77bcf86cd799439012', quantity: 1 }],
    };

    PickupWindow.findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve(null) });
    // follow-up findById
    PickupWindow.findById.mockReturnValue({ lean: () => Promise.resolve({
      _id: 'w1', isDeleted: false, isActive: false, status: 'open', startAt: future, bookedCount: 0, capacity: 1
    }) });

    await ordersCtrl.create(req, res, next);

    expect(Order.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(409);
  });

  test('listMine → returns {items,total,limit,offset}', async () => {
    req.query = { limit: '10', offset: '5' };

    Order.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve([{ _id: 'o1' }])
          })
        })
      })
    });
    Order.countDocuments.mockResolvedValue(1);

    await ordersCtrl.listMine(req, res, next);

    expect(Order.find).toHaveBeenCalledWith({ customerId: 'u1' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ _id: 'o1' }], total: 1, limit: 10, offset: 5
    }));
  });

  test('updateStatus → host transition CONFIRMED → IN_PREP', async () => {
    req.auth.role = 'host';
    req.params.id = '507f1f77bcf86cd799439099';
    req.body.status = 'IN_PREP';

    const orderDoc = { _id: req.params.id, status: 'CONFIRMED', customerId: 'u1', pickupWindowId: 'w1', save: jest.fn() };
    Order.findById.mockResolvedValue(orderDoc);

    await ordersCtrl.updateStatus(req, res, next);

    expect(orderDoc.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(orderDoc);
    expect(next).not.toHaveBeenCalled();
  });

  test('updateStatus → customer cancel allowed (frees capacity)', async () => {
    req.auth = { userId: 'u1', role: 'customer' };
    req.params.id = '507f1f77bcf86cd799439099';
    req.body.status = 'CANCELLED';

    const orderDoc = {
      _id: req.params.id,
      status: 'CONFIRMED',
      customerId: 'u1',
      pickupWindowId: 'w1',
      windowStartAt: future,
      save: jest.fn()
    };
    Order.findById.mockResolvedValue(orderDoc);

    await ordersCtrl.updateStatus(req, res, next);

    expect(orderDoc.save).toHaveBeenCalled();
    expect(PickupWindow.updateOne).toHaveBeenCalledWith(
      { _id: 'w1', bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );
    expect(res.json).toHaveBeenCalledWith(orderDoc);
  });
});
