import { jest } from '@jest/globals';
import * as packageModel from '../../src/models/package.model.js';

describe('models/package.model', () => {
  test('schema should have required fields', () => {
    expect(packageModel.Package.schema.obj).toHaveProperty('name');
    expect(packageModel.Package.schema.obj).toHaveProperty('credits');
    expect(packageModel.Package.schema.obj).toHaveProperty('price');
  });

  test('credits should be positive number', () => {
    const creditsPath = packageModel.Package.schema.paths.credits;
    expect(creditsPath.options.min).toBeGreaterThanOrEqual(1);
  });
});
