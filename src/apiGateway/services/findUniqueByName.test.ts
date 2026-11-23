import { describe, expect, it } from 'vitest';

import { findUniqueByName } from './findUniqueByName';

describe('findUniqueByName', () => {
  it('returns the exact match when exactly one item matches the name', () => {
    const items = [{ name: 'a' }, { name: 'b' }];
    expect(findUniqueByName({ items, name: 'b', label: 'thing' })).toEqual({
      name: 'b',
    });
  });

  it('throws when multiple items match the name exactly', () => {
    const items = [{ name: 'a' }, { name: 'a' }];
    expect(() =>
      findUniqueByName({ items, name: 'a', label: 'thing' }),
    ).toThrow(/Ambiguous thing: multiple results match name 'a'/);
  });

  it('throws the default error when nothing matches and no factory is given', () => {
    const items = [{ name: 'a' }];
    expect(() =>
      findUniqueByName({ items, name: 'z', label: 'thing' }),
    ).toThrow(/Unable to find thing 'z'/);
  });

  it('does NOT fall back to a single returned item when it is not an exact match (prefix-match regression)', () => {
    // GetApiKeys-style nameQuery is a prefix match: a single returned item
    // for a prefix query is not necessarily the exact name requested.
    const items = [{ name: 'api-user-v1-spokane-foo' }];
    expect(() =>
      findUniqueByName({ items, name: 'api-user-v1-spokane', label: 'thing' }),
    ).toThrow(/Unable to find thing 'api-user-v1-spokane'/);
  });

  it('uses the custom notFound error factory when nothing matches', () => {
    const items: { name?: string }[] = [];
    class CustomError extends Error {
      constructor(public readonly who: string) {
        super(`custom: ${who}`);
      }
    }
    expect(() =>
      findUniqueByName({
        items,
        name: 'z',
        label: 'thing',
        notFound: (name) => new CustomError(name),
      }),
    ).toThrow(CustomError);
  });
});
