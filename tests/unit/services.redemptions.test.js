import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../src/models/purchase.model.js', () => ({
  Purchase: { findOne: jest.fn() }
}));
await jest.unstable_mockModule('../../src/models/redemption.model.js', () => ({
  Redemption: { create: jest.fn() }
}));
await jest.unstable_mockModule('mongoose', () => ({
  default: {
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      endSession: jest.fn()
    })
  }
}));

const { redeemCredit } = await import('../../src/services/redemptions.service.js');
const { Purchase } = await import('../../src/models/purchase.model.js');
const { Redemption } = await import('../../src/models/redemption.model.js');

describe('services/redemptions.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('redeemCredit reduces creditsLeft and creates redemption', async () => {
    const mockPurchase = {
      _id: 'p1',
      creditsLeft: 2,
      save: jest.fn()
    };
    mockPurchase.session = () => Promise.resolve(mockPurchase);

    Purchase.findOne.mockReturnValue(mockPurchase);
    Redemption.create.mockResolvedValue([{ _id: 'r1' }]);

    const result = await redeemCredit({ purchaseId: 'p1', customerId: 'c1' });

    expect(result.creditsLeft).toBe(1);
    expect(Redemption.create).toHaveBeenCalled();
    expect(mockPurchase.save).toHaveBeenCalled();
  });

  test('redeemCredit throws if purchase missing', async () => {
    Purchase.findOne.mockReturnValue({ session: () => Promise.resolve(null) });
    await expect(
      redeemCredit({ purchaseId: 'x', customerId: 'c1' })
    ).rejects.toThrow(/not found/i);
  });

  test('redeemCredit throws if creditsLeft is 0', async () => {
    const purchaseZero = { _id: 'p1', creditsLeft: 0, save: jest.fn(), session: () => Promise.resolve({ _id: 'p1', creditsLeft: 0 }) };
    Purchase.findOne.mockReturnValue(purchaseZero);
    await expect(
      redeemCredit({ purchaseId: 'p1', customerId: 'c1' })
    ).rejects.toThrow(/No credits left/i);
  });
});
