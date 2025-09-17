import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../src/models/purchase.model.js', () => ({
  Purchase: { create: jest.fn(), find: jest.fn(), countDocuments: jest.fn() },
}));
await jest.unstable_mockModule('../../src/models/package.model.js', () => ({
  Package: { findOne: jest.fn(() => ({ lean: jest.fn() })) },
}));

const purchasesService = await import('../../src/services/purchases.service.js');
const { Package } = await import('../../src/models/package.model.js');
const { Purchase } = await import('../../src/models/purchase.model.js');

describe('services/purchases.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createPurchase calls model.create when package exists', async () => {
    Package.findOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'p1', isActive: true, credits: 3 }),
    });
    Purchase.create.mockResolvedValue({ _id: 'pr1', packageId: 'p1' });

    const result = await purchasesService.createPurchase({
      customerId: 'c1',
      packageId: 'p1',
      paymentMethod: 'card',
    });

    expect(result._id).toBe('pr1');
    expect(Purchase.create).toHaveBeenCalled();
  });

  test('createPurchase throws when package missing', async () => {
    Package.findOne.mockReturnValue({ lean: () => Promise.resolve(null) });

    await expect(
      purchasesService.createPurchase({
        customerId: 'c1',
        packageId: 'p1',
        paymentMethod: 'card',
      })
    ).rejects.toThrow(/Package not found/);
  });

  test('getWallet returns items and total', async () => {
    Purchase.find.mockReturnValue({
      populate: () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: () => Promise.resolve([{ _id: 'pr1', creditsLeft: 3 }]),
            }),
          }),
        }),
      }),
    });
    Purchase.countDocuments.mockResolvedValue(1);

    const result = await purchasesService.getWallet('c1', 10, 0);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
