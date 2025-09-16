import { jest } from '@jest/globals';

const bookingAggMock = jest.fn();
const slotFindMock = jest.fn(()=>({ lean: jest.fn() }));
const purchaseAggMock = jest.fn();
const redemptionCountMock = jest.fn();

await jest.unstable_mockModule('../../src/models/booking.model.js',()=>({
  Booking:{ aggregate: bookingAggMock }
}));
await jest.unstable_mockModule('../../src/models/slot.model.js',()=>({
  Slot:{ find: slotFindMock }
}));
await jest.unstable_mockModule('../../src/models/purchase.model.js',()=>({
  Purchase:{ aggregate: purchaseAggMock }
}));
await jest.unstable_mockModule('../../src/models/redemption.model.js',()=>({
  Redemption:{ countDocuments: redemptionCountMock }
}));

const reportsCtrl = await import('../../src/controllers/reports.controller.js');
import { AppError } from '../../src/middlewares/error.js';

describe('reports.controller', () => {
  let req,res,next;
  beforeEach(()=> {
    req={ query:{}, auth:{role:'host'} };
    res={ json: jest.fn() };
    next=jest.fn();
    jest.clearAllMocks();
  });

  test('aggregates data', async () => {
    bookingAggMock.mockResolvedValue([{_id:'BOOKED',count:2}]);
    const leanMock = jest.fn();
    
    slotFindMock.mockReturnValue({ lean: leanMock }); 
    leanMock.mockResolvedValue([{ capacity:5, bookedCount:3 }]);

    purchaseAggMock.mockResolvedValue([{totalPurchases:1,totalCredits:10}]);
    redemptionCountMock.mockResolvedValue(4);

    await reportsCtrl.getDaySummary(req,res,next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      bookings: expect.objectContaining({BOOKED:2}),
      slots: expect.any(Object),
      purchases: expect.any(Object),
      redemptions: 4
    }));
  });

  test('forbids non-host', async () => {
    req.auth.role='customer';
    await reportsCtrl.getDaySummary(req,res,next);
    const err=next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.status ?? err.statusCode).toBe(403);
  });

  test('invalid date → 400', async () => {
    req.query.date='bad-date';
    await reportsCtrl.getDaySummary(req,res,next);
    expect((next.mock.calls[0][0].status ?? next.mock.calls[0][0].statusCode)).toBe(400);
  });
});
