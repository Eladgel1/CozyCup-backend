import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

await jest.unstable_mockModule('../../src/models/booking.model.js', () => ({
  Booking: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn()
  }
}));
await jest.unstable_mockModule('../../src/models/slot.model.js', () => ({
  Slot: {
    findOneAndUpdate: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn()
  }
}));

const bookingsCtrl = await import('../../src/controllers/bookings.controller.js');
const { AppError } = await import('../../src/middlewares/error.js');
const { Booking } = await import('../../src/models/booking.model.js');
const { Slot } = await import('../../src/models/slot.model.js');

function mockRes() {
  return {
    status: jest.fn(function (c) { this.statusCode = c; return this; }),
    json: jest.fn(),
  };
}

describe('controllers/bookings.controller', () => {
  let req, res, next;
  const now = new Date();
  const future = new Date(now.getTime() + 60 * 60 * 1000);

  beforeEach(() => {
    req = { auth: { userId: 'u1', role: 'customer' }, body: {}, params: {}, query: {} };
    res = mockRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('create → success (reserves slot, creates booking)', async () => {
    req.body = { slotId: '507f1f77bcf86cd799439011', notes: 'window seat' };

    const slotDoc = { _id: 's1', capacity: 10, bookedCount: 1, startAt: future, endAt: new Date(future.getTime()+30*60*1000) };
    Slot.findOneAndUpdate.mockReturnValue({ lean: () => Promise.resolve(slotDoc) });

    const created = { _id: 'b1', status: 'BOOKED' };
    Booking.create.mockResolvedValue(created);

    await bookingsCtrl.create(req, res, next);

    expect(Slot.findOneAndUpdate).toHaveBeenCalled();
    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      slotId: '507f1f77bcf86cd799439011',
      customerId: 'u1',
      status: 'BOOKED'
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test('listMine → returns {items,total,limit,offset}', async () => {
    req.query = { limit: '10', offset: '0' };

    Booking.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve([{ _id: 'b1' }])
          })
        })
      })
    });
    Booking.countDocuments.mockResolvedValue(1);

    await bookingsCtrl.listMine(req, res, next);

    expect(Booking.find).toHaveBeenCalledWith({ customerId: 'u1' });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ _id: 'b1' }], total: 1, limit: 10, offset: 0
    }));
  });

  test('cancel → host can always cancel, frees capacity', async () => {
    req.auth.role = 'host';
    req.params.id = '507f1f77bcf86cd799439012';

    const bookingDoc = { _id: req.params.id, status: 'BOOKED', slotId: 's1', customerId: 'u1', save: jest.fn() };
    Booking.findById.mockResolvedValue(bookingDoc);

    await bookingsCtrl.cancel(req, res, next);

    expect(bookingDoc.save).toHaveBeenCalled();
    expect(Slot.updateOne).toHaveBeenCalledWith(
      { _id: 's1', bookedCount: { $gt: 0 } },
      { $inc: { bookedCount: -1 } }
    );
    expect(res.json).toHaveBeenCalledWith(bookingDoc);
  });

  test('cancel → customer policy violation → 403', async () => {
    req.auth.role = 'customer';
    req.auth.userId = 'u1';
    req.params.id = '507f1f77bcf86cd799439012';

    const soon = new Date(Date.now() + 10 * 60 * 1000);
    const bookingDoc = { _id: req.params.id, status: 'BOOKED', slotStartAt: soon, slotId: 's1', customerId: 'u1', save: jest.fn() };
    Booking.findById.mockResolvedValue(bookingDoc);

    await bookingsCtrl.cancel(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(403);
  });
});
