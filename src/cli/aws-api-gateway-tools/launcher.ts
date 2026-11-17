/**
 * Dependency-free bin launcher that reports how to install the optional
 * get-dotenv peer instead of exposing a module-resolution stack trace.
 *
 * @packageDocumentation
 */

const getDotenv = '@karmaniverous/get-dotenv@^8.0.0';

/** Build the optional-peer installation hint for a package bin. */
export const getDotenvInstallHint = (bin: string, pkg: string): string =>
  [
    `${bin} needs @karmaniverous/get-dotenv ^8.0.0. Install it:`,
    `  local:  npm i -D ${getDotenv}`,
    `  global: npm i -g ${getDotenv}`,
    `  npx:    npx -p ${getDotenv} -p ${pkg} ${bin}`,
  ].join('\n');

/** True only for Node's failure to resolve get-dotenv itself. */
export const isMissingGetDotenv = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'ERR_MODULE_NOT_FOUND' &&
    typeof message === 'string' &&
    message.includes(`'@karmaniverous/get-dotenv'`)
  );
};

/** Injectable launcher output and exit operations. */
export type LauncherIo = {
  error: (message: string) => void;
  exit: (code: number) => void;
};

const processIo: LauncherIo = {
  error: (message) => {
    console.error(message);
  },
  exit: (code) => {
    process.exit(code);
  },
};

/** Load and run the CLI, handling only a missing get-dotenv package. */
export const launch = async (
  load: () => Promise<{ run: () => Promise<void> }>,
  names: { bin: string; pkg: string },
  io: LauncherIo = processIo,
): Promise<void> => {
  let cli: { run: () => Promise<void> };
  try {
    cli = await load();
  } catch (error) {
    if (!isMissingGetDotenv(error)) throw error;
    io.error(getDotenvInstallHint(names.bin, names.pkg));
    io.exit(1);
    return;
  }

  await cli.run();
};
