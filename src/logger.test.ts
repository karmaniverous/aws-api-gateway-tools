import { describe, expect, it, vi } from 'vitest';

import { assertLogger } from './logger';

describe('assertLogger', () => {
  it('returns a logger implementing the complete contract', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    expect(assertLogger(logger)).toBe(logger);
  });

  it.each([
    null,
    'logger',
    {},
    { debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
    { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: 'nope' },
  ])('rejects an invalid logger: %o', (candidate) => {
    expect(() => assertLogger(candidate)).toThrow(/logger must/);
  });
});
