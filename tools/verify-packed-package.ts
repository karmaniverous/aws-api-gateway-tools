/**
 * Verify packed runtime and strict TypeScript consumption without the optional
 * get-dotenv peer. Run after the package has been built.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is required');

const mode = process.argv[2];
if (mode !== 'runtime' && mode !== 'types') {
  throw new Error('usage: verify-packed-package.ts <runtime|types>');
}

const root = resolve(import.meta.dirname, '..');
const fixture = mkdtempSync(join(tmpdir(), `aws-api-gateway-${mode}-`));

const runNpm = (args: string[]): string =>
  execFileSync(process.execPath, [npmCli, ...args], {
    cwd: fixture,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

const runNode = (args: string[]) =>
  spawnSync(process.execPath, args, { cwd: fixture, encoding: 'utf8' });

try {
  const packed = JSON.parse(
    execFileSync(
      process.execPath,
      [npmCli, 'pack', '--json', '--pack-destination', fixture],
      { cwd: root, encoding: 'utf8' },
    ),
  ) as Array<{ filename: string }>;
  const filename = packed[0]?.filename;
  if (!filename) throw new Error('npm pack did not produce a tarball');

  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  runNpm([
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-package-lock',
    join(fixture, filename),
  ]);

  const getDotenvPath = join(
    fixture,
    'node_modules',
    '@karmaniverous',
    'get-dotenv',
    'package.json',
  );
  if (existsSync(getDotenvPath)) {
    throw new Error('optional get-dotenv peer was installed');
  }

  if (mode === 'runtime') {
    const main = runNode([
      '--input-type=module',
      '--eval',
      [
        "const m = await import('@karmaniverous/aws-api-gateway-tools');",
        "const tools = new m.AwsApiGatewayTools({ xray: 'off' });",
        "if (tools.xray.enabled || typeof m.assertLogger !== 'function') process.exit(2);",
      ].join('\n'),
    ]);
    if (main.status !== 0) {
      throw new Error(`main entry failed without get-dotenv:\n${main.stderr}`);
    }

    const plugin = runNode([
      '--input-type=module',
      '--eval',
      "await import('@karmaniverous/aws-api-gateway-tools/get-dotenv');",
    ]);
    if (
      plugin.status === 0 ||
      !plugin.stderr.includes('ERR_MODULE_NOT_FOUND') ||
      !plugin.stderr.includes("'@karmaniverous/get-dotenv'")
    ) {
      throw new Error(
        `get-dotenv entry should fail on the missing peer:\n${plugin.stderr}`,
      );
    }

    const packageRoot = join(
      fixture,
      'node_modules',
      '@karmaniverous',
      'aws-api-gateway-tools',
    );
    const bin = runNode([
      join(packageRoot, 'dist', 'cli', 'aws-api-gateway-tools', 'index.js'),
      '--help',
    ]);
    const expectedHint = [
      'aws-api-gateway-tools needs @karmaniverous/get-dotenv ^8.0.0-0. Install it:',
      '  local:  npm i -D @karmaniverous/get-dotenv@^8.0.0-0',
      '  global: npm i -g @karmaniverous/get-dotenv@^8.0.0-0',
      '  npx:    npx -p @karmaniverous/get-dotenv@^8.0.0-0 -p @karmaniverous/aws-api-gateway-tools aws-api-gateway-tools',
    ].join('\n');
    if (
      bin.status !== 1 ||
      bin.stderr.trim() !== expectedHint ||
      bin.stdout !== ''
    ) {
      throw new Error(
        `bin did not print the install hint and exit 1:\n${bin.stderr}${bin.stdout}`,
      );
    }
  } else {
    const localPackage = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { devDependencies: Record<string, string> };
    runNpm([
      'install',
      '--save-dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      `@types/node@${localPackage.devDependencies['@types/node']}`,
      `typescript@${localPackage.devDependencies.typescript}`,
    ]);
    if (existsSync(getDotenvPath)) {
      throw new Error('type dependencies installed the optional peer');
    }

    writeFileSync(
      join(fixture, 'index.ts'),
      [
        "import { AwsApiGatewayTools, assertLogger, type Logger } from '@karmaniverous/aws-api-gateway-tools';",
        'const logger: Logger = assertLogger(console);',
        "const tools = new AwsApiGatewayTools({ clientConfig: { logger }, xray: 'off' });",
        'void tools;',
      ].join('\n'),
    );
    writeFileSync(
      join(fixture, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: false,
          strict: true,
          target: 'ES2022',
          types: ['node'],
        },
        include: ['index.ts'],
      }),
    );
    const tsc = runNode([
      join(fixture, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--project',
      'tsconfig.json',
      '--pretty',
      'false',
    ]);
    if (tsc.status !== 0) {
      throw new Error(
        `strict packed typecheck failed:\n${tsc.stdout}${tsc.stderr}`,
      );
    }
  }

  console.log(`verify:${mode}: packed package passed without get-dotenv`);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
