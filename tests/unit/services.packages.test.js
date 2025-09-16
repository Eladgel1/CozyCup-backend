import { jest } from '@jest/globals';

await jest.unstable_mockModule('../../src/models/package.model.js', () => ({
  Package: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn()
  }
}));

const { listPackages, createPackage } = await import('../../src/services/packages.service.js');
const { Package } = await import('../../src/models/package.model.js');

describe('services/packages.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listPackages returns items + total', async () => {
    Package.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => Promise.resolve([{ _id: 'p1' }])
          })
        })
      })
    });
    Package.countDocuments.mockResolvedValue(1);

    const result = await listPackages(10, 0);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(Package.find).toHaveBeenCalled();
    expect(Package.countDocuments).toHaveBeenCalled();
  });

  test('createPackage creates valid package', async () => {
    Package.create.mockResolvedValue({ _id: 'p123', name: 'Gold' });
    const payload = { name: 'Gold', credits: 10, price: 100, isActive: true };

    const result = await createPackage(payload);
    expect(result._id).toBe('p123');
    expect(Package.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Gold', credits: 10, price: 100 })
    );
  });

  test('createPackage throws on invalid credits', async () => {
    await expect(createPackage({ name: 'Gold', credits: 0, price: 10 }))
      .rejects.toThrow(/Invalid credits/);
  });

  test('createPackage throws on invalid price', async () => {
    await expect(createPackage({ name: 'Gold', credits: 5, price: -5 }))
      .rejects.toThrow(/Invalid price/);
  });
});
