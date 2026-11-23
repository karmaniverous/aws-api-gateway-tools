import { describe, expect, it, vi } from 'vitest';

import { ApiKeyNotFoundError } from '../errors';
import type { ApiGatewayPort } from '../ports/apiGatewayPort';
import { getApiKeyValueByName } from './getApiKeyValueByName';

const makePort = (
  listApiKeys: ApiGatewayPort['listApiKeys'],
): ApiGatewayPort => ({
  listApiKeys,
  listRestApis: vi.fn(),
  flushStageCache: vi.fn(),
});

describe('getApiKeyValueByName', () => {
  it('returns the value for an exact name match', async () => {
    const port = makePort(
      vi.fn().mockResolvedValue([{ name: 'A', value: 'va' }]),
    );
    await expect(getApiKeyValueByName(port, 'A')).resolves.toBe('va');
  });

  it('throws ApiKeyNotFoundError (with keyName) when no key has that exact name', async () => {
    const port = makePort(vi.fn().mockResolvedValue([]));
    const err = await getApiKeyValueByName(port, 'missing').catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiKeyNotFoundError);
    expect((err as ApiKeyNotFoundError).keyName).toBe('missing');
  });

  it('does not fall back to a prefix match: an item without an exact name match still throws ApiKeyNotFoundError', async () => {
    const port = makePort(
      vi
        .fn()
        .mockResolvedValue([{ name: 'api-user-v1-spokane-foo', value: 'v' }]),
    );
    const err = await getApiKeyValueByName(port, 'api-user-v1-spokane').catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiKeyNotFoundError);
  });

  it('throws a plain Error (not ApiKeyNotFoundError) when the exact name is ambiguous', async () => {
    const port = makePort(
      vi.fn().mockResolvedValue([
        { name: 'A', value: 'v1' },
        { name: 'A', value: 'v2' },
      ]),
    );
    const err = await getApiKeyValueByName(port, 'A').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ApiKeyNotFoundError);
    expect((err as Error).message).toMatch(/Ambiguous/);
  });

  it('throws a plain Error (not ApiKeyNotFoundError) when the key has no value', async () => {
    const port = makePort(vi.fn().mockResolvedValue([{ name: 'A' }]));
    const err = await getApiKeyValueByName(port, 'A').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ApiKeyNotFoundError);
    expect((err as Error).message).toMatch(/missing a value/);
  });

  it('propagates other port failures (e.g. credentials/throttling) unchanged', async () => {
    const boom = new Error('ThrottlingException');
    const port = makePort(vi.fn().mockRejectedValue(boom));
    await expect(getApiKeyValueByName(port, 'A')).rejects.toBe(boom);
  });
});
