import type * as GetDotenv from '@karmaniverous/get-dotenv';
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

const dotenvExpand = vi.fn((raw: string) => raw);
const readMergedOptions = vi.fn((): Record<string, unknown> => ({
  debug: false,
  env: 'dev',
}));

vi.mock('@karmaniverous/get-dotenv', async () => ({
  buildSpawnEnv: (base: unknown) => base,
  dotenvExpand: (raw: string) => dotenvExpand(raw),
  parseVarsPairs: (
    await vi.importActual<typeof GetDotenv>('@karmaniverous/get-dotenv')
  ).parseVarsPairs,
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
  readMergedOptions: () => readMergedOptions(),
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

  describe('--vars', () => {
    const byName =
      (values: Record<string, string>, missing: string[] = []) =>
      (opts: {
        keyNames: string[];
        ifExists?: boolean;
        onMissing?: (keyName: string) => void;
      }) => {
        const found: string[] = [];
        for (const name of opts.keyNames) {
          if (missing.includes(name)) {
            if (!opts.ifExists) {
              return Promise.reject(new Error(`API key '${name}' not found.`));
            }
            opts.onMissing?.(name);
          } else found.push(values[name] ?? `v-${name}`);
        }
        return Promise.resolve(found);
      };

    it('writes each variable from its own key in one edit', async () => {
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys(['--vars', 'A=ka', 'B=kb']);

      expect(getApiKeyValuesByNames).toHaveBeenCalledTimes(2);
      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { A: 'v-ka', B: 'v-kb' },
        expect.objectContaining({ scope: 'env', env: 'dev' }),
      );
    });

    it('joins a repeated variable with --delimiter', async () => {
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys(['--vars', 'X=k1', 'X=k2', '--delimiter', '|']);

      expect(getApiKeyValuesByNames).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ keyNames: ['k1', 'k2'] }),
      );
      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { X: 'v-k1|v-k2' },
        expect.anything(),
      );
    });

    it('parses with the root vars syntax from the merged options', async () => {
      readMergedOptions.mockReturnValue({
        debug: false,
        env: 'dev',
        varsDelimiter: ',',
        varsAssignor: ':',
      });
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys(['--vars', 'A:ka,B:kb']);

      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { A: 'v-ka', B: 'v-kb' },
        expect.anything(),
      );
      readMergedOptions.mockReturnValue({ debug: false, env: 'dev' });
    });

    it('expands an argument into several pairs', async () => {
      dotenvExpand.mockImplementation((raw) =>
        raw === '$MAP' ? 'A=ka B=kb' : raw,
      );
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys(['--vars', '$MAP']);

      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { A: 'v-ka', B: 'v-kb' },
        expect.anything(),
      );
      dotenvExpand.mockImplementation((raw) => raw);
    });

    it.each([
      [['--vars', 'A=ka', '--key-names', 'k']],
      [['--vars', 'A=ka', '--variable-name', 'V']],
    ])('rejects %j', async (argv) => {
      await expect(runPullKeys(argv)).rejects.toThrow(
        /--vars cannot be combined/,
      );
      expect(getApiKeyValuesByNames).not.toHaveBeenCalled();
    });

    it('fails on a missing key without --if-exists', async () => {
      getApiKeyValuesByNames.mockImplementation(byName({}, ['kb']));

      await expect(runPullKeys(['--vars', 'A=ka', 'B=kb'])).rejects.toThrow(
        /not found/,
      );
      expect(editDotenvFile).not.toHaveBeenCalled();
    });

    it('with --if-exists: writes found keys, leaves all-missing variables untouched, and summarizes', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getApiKeyValuesByNames.mockImplementation(byName({}, ['kb', 'kx2']));

      await runPullKeys([
        '--vars',
        'A=ka',
        'B=kb',
        'X=kx1',
        'X=kx2',
        '--if-exists',
      ]);

      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { A: 'v-ka', X: 'v-kx1' },
        expect.anything(),
      );
      expect(warn).toHaveBeenCalledWith("API key 'kb' not found: skipping");
      expect(warn).toHaveBeenCalledWith('2 of 4 API keys not found.');
      warn.mockRestore();
    });

    it('with --if-exists: writes nothing when every key is missing', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getApiKeyValuesByNames.mockImplementation(byName({}, ['ka']));

      await runPullKeys(['--vars', 'A=ka', '--if-exists']);

      expect(editDotenvFile).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith('1 of 1 API keys not found.');
      warn.mockRestore();
    });

    it('uses pullKeys.vars from config (string and array forms)', async () => {
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys([], {
        pullKeys: { vars: { A: 'ka', X: ['k1', 'k2'] } },
      });

      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { A: 'v-ka', X: 'v-k1, v-k2' },
        expect.anything(),
      );
    });

    it('lets CLI --vars override config pullKeys.vars', async () => {
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys(['--vars', 'B=kb'], {
        pullKeys: { vars: { A: 'ka' } },
      });

      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { B: 'v-kb' },
        expect.anything(),
      );
    });

    it('lets CLI --key-names override config pullKeys.vars', async () => {
      getApiKeyValuesByNames.mockImplementation(byName({}));

      await runPullKeys(['--key-names', 'k'], {
        pullKeys: { vars: { A: 'ka' } },
      });

      expect(editDotenvFile).toHaveBeenCalledExactlyOnceWith(
        { API_KEYS: 'v-k' },
        expect.anything(),
      );
    });

    it.each([
      [{ vars: { A: 'ka' }, keyNames: ['k'] }],
      [{ vars: { A: 'ka' }, variableName: 'V' }],
    ])('rejects config %j', async (pullKeys) => {
      await expect(runPullKeys([], { pullKeys })).rejects.toThrow(
        /pullKeys\.vars cannot be combined/,
      );
    });
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
