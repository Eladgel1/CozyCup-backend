import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

await jest.unstable_mockModule('../../src/models/slot.model.js', () => ({
  Slot: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
}));

const slotsCtrl = await import('../../src/controllers/slots.controller.js');
const { AppError } = await import('../../src/middlewares/error.js');
const { Slot } = await import('../../src/models/slot.model.js');

function mockRes() {
  return {
    status: jest.fn(function (c) {
      this.statusCode = c;
      return this;
    }),
    json: jest.fn(),
  };
}

describe('controllers/slots.controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { auth: { userId: 'u1', role: 'host' }, body: {}, params: {}, query: {} };
    res = mockRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('listPublic → returns mapped items + totals', async () => {
    const items = [
      {
        _id: 's1',
        startAt: new Date(),
        endAt: new Date(Date.now() + 3600000),
        capacity: 10,
        bookedCount: 3,
        status: 'open',
        displayOrder: 0,
        notes: 'n',
      },
    ];

    Slot.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve(items),
          }),
        }),
      }),
    });
    Slot.countDocuments.mockResolvedValue(1);

    await slotsCtrl.listPublic(req, res, next);

    expect(Slot.find).toHaveBeenCalledWith({ isActive: true, isDeleted: false, status: 'open' });
    const payload = res.json.mock.calls[0][0];
    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        _id: 's1',
        remaining: 7,
        status: 'open',
      })
    );
  });

  test('create → success', async () => {
    const start = new Date(Date.now() + 3600000).toISOString();
    const end = new Date(Date.now() + 7200000).toISOString();
    req.body = { startAt: start, endAt: end, capacity: 5, status: 'open' };

    const created = { _id: 's2' };
    Slot.create.mockResolvedValue(created);

    await slotsCtrl.create(req, res, next);

    expect(Slot.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test('create → invalid payload → 400', async () => {
    req.body = { startAt: 'bad', endAt: 'bad', capacity: -1, status: 'weird' }; // גורם ל-validateCreate לזרוק AppError(400)

    await slotsCtrl.create(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(400);
  });
});
