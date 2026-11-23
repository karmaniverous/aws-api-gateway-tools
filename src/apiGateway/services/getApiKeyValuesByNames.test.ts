import { describe, expect, it, vi } from 'vitest';

import { ApiKeyNotFoundError } from '../errors';
import type { ApiGatewayPort } from '../ports/apiGatewayPort';
import { getApiKeyValuesByNames } from './getApiKeyValuesByNames';

const makePort = (
  byName: Record<string, { name: string; value?: string }[] | Error>,
): ApiGatewayPort => ({
  listApiKeys: vi.fn((opts: { nameQuery: string }) => {
    const entry = byName[opts.nameQuery];
    return entry instanceof Error
      ? Promise.reject(entry)
      : Promise.resolve(entry);
  }),
  listRestApis: vi.fn(),
  flushStageCache: vi.fn(),
});

describe('getApiKeyValuesByNames', () => {
  it('returns all values in order when every key is found', async () => {
    const port = makePort({
      A: [{ name: 'A', value: 'va' }],
      B: [{ name: 'B', value: 'vb' }],
    });
    await expect(getApiKeyValuesByNames(port, ['A', 'B'])).resolves.toEqual([
      'va',
      'vb',
    ]);
  });

  it('fails the whole operation when a key is missing and ifExists is not set', async () => {
    const port = makePort({ A: [{ name: 'A', value: 'va' }], B: [] });
    await expect(
      getApiKeyValuesByNames(port, ['A', 'B']),
    ).rejects.toBeInstanceOf(ApiKeyNotFoundError);
  });

  it('skips a missing key and reports it via onMissing when ifExists is set', async () => {
    const port = makePort({ A: [{ name: 'A', value: 'va' }], B: [] });
    const onMissing = vi.fn();
    await expect(
      getApiKeyValuesByNames(port, ['A', 'B'], { ifExists: true, onMissing }),
    ).resolves.toEqual(['va']);
    expect(onMissing).toHaveBeenCalledExactlyOnceWith('B');
  });

  it('preserves order for a mix of found and missing keys with ifExists', async () => {
    const port = makePort({
      A: [{ name: 'A', value: 'va' }],
      B: [],
      C: [{ name: 'C', value: 'vc' }],
    });
    const onMissing = vi.fn();
    await expect(
      getApiKeyValuesByNames(port, ['A', 'B', 'C'], {
        ifExists: true,
        onMissing,
      }),
    ).resolves.toEqual(['va', 'vc']);
    expect(onMissing).toHaveBeenCalledExactlyOnceWith('B');
  });

  it('returns an empty array when none of the requested keys exist (ifExists)', async () => {
    const port = makePort({ A: [], B: [] });
    const onMissing = vi.fn();
    await expect(
      getApiKeyValuesByNames(port, ['A', 'B'], { ifExists: true, onMissing }),
    ).resolves.toEqual([]);
    expect(onMissing).toHaveBeenCalledTimes(2);
  });

  it('still fails with ifExists when the failure is not ApiKeyNotFoundError (e.g. throttling)', async () => {
    const boom = new Error('ThrottlingException');
    const port = makePort({ A: boom });
    await expect(
      getApiKeyValuesByNames(port, ['A'], { ifExists: true }),
    ).rejects.toBe(boom);
  });

  it('still fails with ifExists when the exact name is ambiguous', async () => {
    const port = makePort({
      A: [
        { name: 'A', value: 'v1' },
        { name: 'A', value: 'v2' },
      ],
    });
    await expect(
      getApiKeyValuesByNames(port, ['A'], { ifExists: true }),
    ).rejects.toThrow(/Ambiguous/);
  });

  it('still fails with ifExists when a found key has no value', async () => {
    const port = makePort({ A: [{ name: 'A' }] });
    await expect(
      getApiKeyValuesByNames(port, ['A'], { ifExists: true }),
    ).rejects.toThrow(/missing a value/);
  });
});
