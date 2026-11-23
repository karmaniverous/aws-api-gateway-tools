import {
  FlushStageCacheCommand,
  GetApiKeysCommand,
  GetRestApisCommand,
} from '@aws-sdk/client-api-gateway';
import { describe, expect, it, vi } from 'vitest';

import { AwsApiGatewayTools } from './AwsApiGatewayTools';
import { ApiKeyNotFoundError } from './errors';

type SendableClient = { send: (cmd: unknown) => Promise<unknown> };
const spySend = (tools: AwsApiGatewayTools) =>
  vi.spyOn(tools.client as unknown as SendableClient, 'send');

describe('AwsApiGatewayTools', () => {
  it('flushes stage cache by id', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    const send = spySend(tools).mockResolvedValueOnce({});

    await expect(
      tools.flushStageCache({ restApiId: 'abc', stageName: 'dev' }),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(FlushStageCacheCommand);
  });

  it('flushes stage cache by name (resolve id then flush)', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    const send = spySend(tools)
      .mockResolvedValueOnce({ items: [{ id: 'xyz', name: 'my-api' }] })
      .mockResolvedValueOnce({});

    await expect(
      tools.flushStageCacheByName({ apiName: 'my-api', stageName: 'dev' }),
    ).resolves.toEqual({ apiId: 'xyz' });

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetRestApisCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(FlushStageCacheCommand);
  });

  it('retrieves API key values by names (preserve order)', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    const send = spySend(tools)
      .mockResolvedValueOnce({ items: [{ name: 'A', value: 'va' }] })
      .mockResolvedValueOnce({ items: [{ name: 'B', value: 'vb' }] });

    await expect(
      tools.getApiKeyValuesByNames({ keyNames: ['A', 'B'] }),
    ).resolves.toEqual(['va', 'vb']);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(GetApiKeysCommand);
    expect(send.mock.calls[1]?.[0]).toBeInstanceOf(GetApiKeysCommand);
  });

  it('fails (ApiKeyNotFoundError) when a key is missing by exact name, even if GetApiKeys returns a prefix match', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    // GetApiKeys nameQuery is a prefix match: this simulates querying
    // 'api-user-v1-spokane' and AWS returning 'api-user-v1-spokane-foo'.
    spySend(tools).mockResolvedValueOnce({
      items: [{ name: 'api-user-v1-spokane-foo', value: 'v' }],
    });

    const err = await tools
      .getApiKeyValuesByNames({ keyNames: ['api-user-v1-spokane'] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiKeyNotFoundError);
  });

  it('with ifExists: skips missing keys (warning via onMissing) and still writes found ones', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    spySend(tools)
      .mockResolvedValueOnce({ items: [{ name: 'A', value: 'va' }] })
      .mockResolvedValueOnce({ items: [] });

    const onMissing = vi.fn();
    await expect(
      tools.getApiKeyValuesByNames({
        keyNames: ['A', 'B'],
        ifExists: true,
        onMissing,
      }),
    ).resolves.toEqual(['va']);
    expect(onMissing).toHaveBeenCalledExactlyOnceWith('B');
  });

  it('with ifExists: returns an empty array when none of the keys exist', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    spySend(tools)
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });

    await expect(
      tools.getApiKeyValuesByNames({ keyNames: ['A', 'B'], ifExists: true }),
    ).resolves.toEqual([]);
  });

  it('with ifExists: a non-not-found error (e.g. throttling) still fails', async () => {
    const tools = new AwsApiGatewayTools({ xray: 'off' });
    const boom = new Error('ThrottlingException');
    spySend(tools).mockRejectedValueOnce(boom);

    await expect(
      tools.getApiKeyValuesByNames({ keyNames: ['A'], ifExists: true }),
    ).rejects.toBe(boom);
  });
});
