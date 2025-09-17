import { jest } from '@jest/globals';
import { AppError } from '../../src/middlewares/error.js';

const findMock = jest.fn();
const countDocumentsMock = jest.fn();
const createMock = jest.fn();
const findOneAndUpdateMock = jest.fn();

await jest.unstable_mockModule('../../src/models/pickupWindow.model.js', () => ({
  PickupWindow: {
    find: findMock,
    countDocuments: countDocumentsMock,
    create: createMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

const pickupCtrl = await import('../../src/controllers/pickup-windows.controller.js');

describe('controllers/pickup-windows.controller', () => {
  let req, res, next;
  beforeEach(() => {
    req = { query: {}, body: {}, params: {}, auth: { userId: 'u1', role: 'host' } };
    res = { json: jest.fn(), status: jest.fn(() => res) };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('listPublic returns mapped windows', async () => {
    const mockWindows = [{ _id: 'w1', capacity: 10, bookedCount: 4, status: 'open' }];
    findMock.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: jest.fn().mockResolvedValue(mockWindows),
          }),
        }),
      }),
    });
    countDocumentsMock.mockResolvedValue(1);

    await pickupCtrl.listPublic(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        total: 1,
      })
    );
  });

  test('create inserts', async () => {
    req.body = {
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      capacity: 5,
    };
    const created = { _id: 'w1' };
    createMock.mockResolvedValue(created);

    await pickupCtrl.create(req, res, next);
    expect(createMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('update modifies', async () => {
    req.params.id = '64cbe1234cbe1234cbe12345';
    req.body = { capacity: 15 };
    const updated = { _id: req.params.id, capacity: 15 };
    findOneAndUpdateMock.mockReturnValue({ lean: jest.fn().mockResolvedValue(updated) });

    await pickupCtrl.update(req, res, next);
    expect(findOneAndUpdateMock).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test('update invalid id → 400', async () => {
    req.params.id = 'bad';
    await pickupCtrl.update(req, res, next);
    const err = next.mock.calls[0][0];
    expect(err.status ?? err.statusCode).toBe(400);
  });

  test('update not found → 404', async () => {
    req.params.id = '64cbe1234cbe1234cbe12345';
    req.body = { capacity: 15 };

    findOneAndUpdateMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    await pickupCtrl.update(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0];
    expect(err.statusCode ?? err.status).toBe(404);
  });
});
