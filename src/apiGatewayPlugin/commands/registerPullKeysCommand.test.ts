import { Command, Option } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiGatewayPluginConfig } from '../apiGatewayPluginConfig';
import type { ApiGatewayPluginApi, ApiGatewayPluginCli } from './types';

const editDotenvFile = vi.fn(() =>
  Promise.resolve({ path: 'fake/.env.local' }),
);
const requireString = vi.fn((value: unknown, message: string) => {
  if (typeof value !== 'string' || !value) throw new Error(message);
  return value;
});
const getApiKeyValuesByNames =
  vi.fn<
    (opts: {
      keyNames: string[];
      ifExists?: boolean;
      onMissing?: (keyName: string) => void;
    }) => Promise<string[]>
  >();

vi.mock('@karmaniverous/get-dotenv', () => ({
  buildSpawnEnv: (base: unknown) => base,
  dotenvExpand: (raw: string) => raw,
  editDotenvFile,
  getDotenvCliOptions2Options: (bag: Record<string, unknown>) => ({
    paths: ['./'],
    dotenvToken: '.env',
    privateToken: 'local',
    ...bag,
  }),
  requireString,
  silentLogger: { debug() {}, info() {}, warn() {}, error() {} },
}));

vi.mock('@karmaniverous/get-dotenv/cliHost', () => ({
  readMergedOptions: () => ({ debug: false, env: 'dev' }),
}));

vi.mock('@karmaniverous/get-dotenv/plugins/aws', () => ({
  getAwsRegion: () => undefined,
}));

vi.mock('../../apiGateway/AwsApiGatewayTools', () => ({
  AwsApiGatewayTools: vi.fn(function (this: {
    getApiKeyValuesByNames: typeof getApiKeyValuesByNames;
  }) {
    this.getApiKeyValuesByNames = getApiKeyValuesByNames;
  }),
}));

// Import after mocks are registered.
const { registerPullKeysCommand } = await import('./registerPullKeysCommand');

type Mount = Command & { action: Command['action'] };

const buildCliAndPlugin = (
  cfg: ApiGatewayPluginConfig,
): {
  cli: ApiGatewayPluginCli;
  plugin: ApiGatewayPluginApi;
  mount: Mount;
} => {
  const mount = new Command('pull-keys') as Mount;

  const cli = {
    ns: () => mount,
    getCtx: () => ({ dotenv: {} }),
  } as unknown as ApiGatewayPluginCli;

  const plugin = {
    createPluginDynamicOption: (
      _cliArg: unknown,
      flags: string,
      desc: (helpCfg: unknown, pluginCfg: ApiGatewayPluginConfig) => string,
    ) => new Option(flags, desc({}, cfg)),
    readConfig: () => cfg,
  } as unknown as ApiGatewayPluginApi;

  return { cli, plugin, mount };
};

const baseCfg: ApiGatewayPluginConfig = {};

const runPullKeys = async (
  argv: string[],
  cfg: ApiGatewayPluginConfig = baseCfg,
) => {
  const { cli, plugin, mount } = buildCliAndPlugin(cfg);
  registerPullKeysCommand({ cli, plugin });
  mount.exitOverride();
  await mount.parseAsync(['node', 'pull-keys', ...argv]);
  return { mount };
};

describe('registerPullKeysCommand', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('writes the joined values when every key is found', async () => {
    getApiKeyValuesByNames.mockResolvedValue(['va', 'vb']);

    await runPullKeys(['--key-names', 'A', 'B']);

    expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
      { API_KEYS: 'va, vb' },
      expect.objectContaining({ scope: 'env', env: 'dev' }),
    );
  });

  it('fails the whole command when a key is missing and --if-exists is not set', async () => {
    getApiKeyValuesByNames.mockRejectedValue(
      Object.assign(new Error("API key 'B' not found."), {
        name: 'ApiKeyNotFoundError',
      }),
    );

    await expect(runPullKeys(['--key-names', 'A', 'B'])).rejects.toThrow(
      /not found/,
    );
    expect(editDotenvFile).not.toHaveBeenCalled();
  });

  it('with --if-exists: skips missing keys (via onMissing) and still writes found ones', async () => {
    getApiKeyValuesByNames.mockImplementation((opts) => {
      opts.onMissing?.('B');
      return Promise.resolve(['va']);
    });

    await runPullKeys(['--key-names', 'A', 'B', '--if-exists']);

    expect(getApiKeyValuesByNames).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ keyNames: ['A', 'B'], ifExists: true }),
    );
    expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
      { API_KEYS: 'va' },
      expect.anything(),
    );
  });

  it('with --if-exists: leaves the target variable untouched when none of the keys exist', async () => {
    getApiKeyValuesByNames.mockResolvedValue([]);

    await runPullKeys(['--key-names', 'A', 'B', '--if-exists']);

    expect(editDotenvFile).not.toHaveBeenCalled();
  });

  it('honors pullKeys.ifExists from config when --if-exists is not passed on the CLI', async () => {
    getApiKeyValuesByNames.mockResolvedValue([]);

    await runPullKeys(['--key-names', 'A'], { pullKeys: { ifExists: true } });

    expect(getApiKeyValuesByNames).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ ifExists: true }),
    );
    expect(editDotenvFile).not.toHaveBeenCalled();
  });

  it('documents --if-exists in help text, including the config default', () => {
    const { plugin } = buildCliAndPlugin({ pullKeys: { ifExists: true } });
    const desc = (
      plugin.createPluginDynamicOption as unknown as (
        c: unknown,
        f: string,
        d: (h: unknown, c: ApiGatewayPluginConfig) => string,
      ) => Option
    )(
      undefined,
      '--if-exists',
      (_h, cfg) =>
        `skip missing API keys (exact-name match only) with a warning instead of failing; leaves the target variable untouched if none are found (default: ${
          cfg.pullKeys?.ifExists ? 'true' : 'false'
        })`,
    );
    expect(desc.description).toMatch(/skip missing API keys/);
    expect(desc.description).toMatch(/default: true/);
  });
});
