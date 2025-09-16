import { jest } from '@jest/globals';

const resetMock = jest.fn();
const menuInsert = jest.fn();
const pwInsert = jest.fn();
const slotInsert = jest.fn();
const pkgInsert = jest.fn();
const userCreate = jest.fn();

await jest.unstable_mockModule('../../src/seed/reset.js',()=>({ resetDatabase: resetMock }));
await jest.unstable_mockModule('../../src/models/menuItem.model.js',()=>({ MenuItem:{ insertMany: menuInsert } }));
await jest.unstable_mockModule('../../src/models/pickupWindow.model.js',()=>({ PickupWindow:{ insertMany: pwInsert } }));
await jest.unstable_mockModule('../../src/models/slot.model.js',()=>({ Slot:{ insertMany: slotInsert } }));
await jest.unstable_mockModule('../../src/models/package.model.js',()=>({ Package:{ insertMany: pkgInsert } }));
await jest.unstable_mockModule('../../src/models/user.model.js',()=>({ default:{ create: userCreate } }));
await jest.unstable_mockModule('bcryptjs',()=>({ default:{ hash: jest.fn(()=> 'hashedpw') } }));
await jest.unstable_mockModule('mongoose',()=>({
  default:{ connect: jest.fn(), disconnect: jest.fn(), connection:{ readyState:0 } }
}));

const seed = await import('../../src/seed/seed.js');

describe('seed.demo-data', () => {
  test('runSeed inserts all', async () => {
    await seed.runSeed();
    expect(resetMock).toHaveBeenCalled();
    expect(menuInsert).toHaveBeenCalled();
    expect(pwInsert).toHaveBeenCalled();
    expect(slotInsert).toHaveBeenCalled();
    expect(pkgInsert).toHaveBeenCalled();
    expect(userCreate).toHaveBeenCalled();
  });
});
