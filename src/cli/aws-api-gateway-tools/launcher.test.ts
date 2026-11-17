import { describe, expect, it, vi } from 'vitest';

import { getDotenvInstallHint, isMissingGetDotenv, launch } from './launcher';

const names = {
  bin: 'aws-api-gateway-tools',
  pkg: '@karmaniverous/aws-api-gateway-tools',
};

const expectedHint = [
  'aws-api-gateway-tools needs @karmaniverous/get-dotenv ^8.0.0. Install it:',
  '  local:  npm i -D @karmaniverous/get-dotenv@^8.0.0',
  '  global: npm i -g @karmaniverous/get-dotenv@^8.0.0',
  '  npx:    npx -p @karmaniverous/get-dotenv@^8.0.0 -p @karmaniverous/aws-api-gateway-tools aws-api-gateway-tools',
].join('\n');

const missingGetDotenv = Object.assign(
  new Error(
    "Cannot find package '@karmaniverous/get-dotenv' imported from /app/run.js",
  ),
  { code: 'ERR_MODULE_NOT_FOUND' },
);

describe('getDotenvInstallHint', () => {
  it('lists local, global, and npx installation routes', () => {
    expect(getDotenvInstallHint(names.bin, names.pkg)).toBe(expectedHint);
  });
});

describe('isMissingGetDotenv', () => {
  it('recognizes only a missing get-dotenv package', () => {
    expect(isMissingGetDotenv(missingGetDotenv)).toBe(true);
    expect(
      isMissingGetDotenv(
        Object.assign(new Error("Cannot find package 'commander'"), {
          code: 'ERR_MODULE_NOT_FOUND',
        }),
      ),
    ).toBe(false);
    expect(isMissingGetDotenv(new Error('other'))).toBe(false);
    expect(isMissingGetDotenv(null)).toBe(false);
  });
});

describe('launch', () => {
  it('prints the hint and exits 1 when get-dotenv is absent', async () => {
    const io = { error: vi.fn(), exit: vi.fn() };

    await launch(() => Promise.reject(missingGetDotenv), names, io);

    expect(io.error).toHaveBeenCalledExactlyOnceWith(expectedHint);
    expect(io.exit).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('uses stderr and process exit for the default launcher IO', async () => {
    const exitError = new Error('process exited');
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw exitError;
    });

    try {
      await expect(
        launch(() => Promise.reject(missingGetDotenv), names),
      ).rejects.toBe(exitError);

      expect(error).toHaveBeenCalledExactlyOnceWith(expectedHint);
      expect(exit).toHaveBeenCalledExactlyOnceWith(1);
    } finally {
      error.mockRestore();
      exit.mockRestore();
    }
  });

  it('runs the CLI when get-dotenv is present', async () => {
    const io = { error: vi.fn(), exit: vi.fn() };
    const run = vi.fn(() => Promise.resolve());

    await launch(() => Promise.resolve({ run }), names, io);

    expect(run).toHaveBeenCalledOnce();
    expect(io.error).not.toHaveBeenCalled();
    expect(io.exit).not.toHaveBeenCalled();
  });

  it('rethrows unrelated load errors and run errors', async () => {
    const io = { error: vi.fn(), exit: vi.fn() };
    const loadError = new Error('bad load');
    await expect(
      launch(() => Promise.reject(loadError), names, io),
    ).rejects.toBe(loadError);

    const runError = new Error('bad run');
    await expect(
      launch(
        () => Promise.resolve({ run: () => Promise.reject(runError) }),
        names,
        io,
      ),
    ).rejects.toBe(runError);
  });
});
