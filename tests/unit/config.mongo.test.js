import { jest } from '@jest/globals';

const onMock = jest.fn();
const setMock = jest.fn();
const connectMock = jest.fn();
const disconnectMock = jest.fn();

connectMock.mockResolvedValue({
  connection: { on: onMock },
});

await jest.unstable_mockModule('mongoose', () => ({
  default: {
    connect: connectMock,
    disconnect: disconnectMock,
    connection: { on: onMock },
    set: setMock,
  },
}));

const mongoModule = await import('../../src/config/mongo.js');

function getFn(names) {
  for (const name of names) {
    if (typeof mongoModule[name] === 'function') return mongoModule[name];
  }
  if (mongoModule.default) {
    for (const name of names) {
      if (typeof mongoModule.default[name] === 'function') return mongoModule.default[name];
    }
  }
  return undefined;
}

describe('config/mongo', () => {
  let logSpy, errSpy;

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('connect returns a connection object with .on()', async () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/testdb';

    const connectFn = getFn(['connectMongo', 'connect', 'init', 'initialize']);
    expect(typeof connectFn).toBe('function');

    const result = await connectFn();

    expect(setMock).toHaveBeenCalledWith('strictQuery', true);
    expect(connectMock).toHaveBeenCalled();
    expect(result).toHaveProperty('on');
    expect(typeof result.on).toBe('function');
  });

  test('disconnect calls mongoose.disconnect', async () => {
    const disconnectFn = getFn(['disconnectMongo', 'disconnect', 'close']);
    expect(typeof disconnectFn).toBe('function');

    await disconnectFn();

    expect(disconnectMock).toHaveBeenCalled();
  });
});
