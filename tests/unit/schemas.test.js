import { createPackageSchema } from '../../src/schemas/packages.schema.js';
import { createPurchaseSchema } from '../../src/schemas/purchases.schema.js';
import { redeemSchema, createRedeemTokenSchema } from '../../src/schemas/redemptions.schema.js';

describe('schemas', () => {
  test('packages schema validates correct object', async () => {
    const data = { name: 'Gold', credits: 5, price: 10 };
    await expect(createPackageSchema.parseAsync({ body: data })).resolves.toEqual(
      expect.objectContaining({ body: data })
    );
  });

  test('packages schema rejects missing name', async () => {
    const data = { credits: 5, price: 10 };
    await expect(createPackageSchema.parseAsync({ body: data })).rejects.toThrow();
  });

  test('purchases schema validates correct object', async () => {
    const data = { packageId: '507f1f77bcf86cd799439011' }; // 24-char hex string
    await expect(createPurchaseSchema.parseAsync({ body: data })).resolves.toEqual(
      expect.objectContaining({ body: data })
    );
  });

  test('redeem schema fails if neither purchaseId nor token provided', async () => {
    await expect(redeemSchema.parseAsync({ body: {} })).rejects.toThrow();
  });

  test('createRedeemTokenSchema validates correct object', async () => {
    const data = { purchaseId: '507f1f77bcf86cd799439011' };
    await expect(createRedeemTokenSchema.parseAsync({ body: data })).resolves.toEqual(
      expect.objectContaining({ body: data })
    );
  });
});
