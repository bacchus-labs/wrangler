/**
 * Placeholder test to verify Jest configuration
 */

import { getVersion, WRANGLER_VERSION } from '../src/placeholder.js';

describe('Placeholder Tests', () => {
  it('should return the correct version', () => {
    expect(getVersion()).toBe('1.0.0');
  });

  it('should export WRANGLER_VERSION constant', () => {
    expect(WRANGLER_VERSION).toBe('1.0.0');
  });
});
