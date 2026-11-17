/**
 * Run targeted mutation checks for the get-dotenv 8 package boundary. Each
 * mutant must be killed by its focused test or verifier, and every file is
 * restored before the next mutant runs.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is required');

type Mutation = {
  name: string;
  file: string;
  original: string;
  mutant: string;
  commands: string[][];
};

const mutations: Mutation[] = [
  {
    name: 'logger requires error()',
    file: 'src/logger.ts',
    original:
      "    typeof logger.warn !== 'function' ||\n    typeof logger.error !== 'function'\n",
    mutant: "    typeof logger.warn !== 'function' ||\n    false\n",
    commands: [['test', '--', 'src/logger.test.ts']],
  },
  {
    name: 'launcher distinguishes another missing package',
    file: 'src/cli/aws-api-gateway-tools/launcher.ts',
    original: "    message.includes(`'@karmaniverous/get-dotenv'`)\n",
    mutant: '    true\n',
    commands: [
      ['test', '--', 'src/cli/aws-api-gateway-tools/launcher.test.ts'],
    ],
  },
  {
    name: 'launcher exits with failure status',
    file: 'src/cli/aws-api-gateway-tools/launcher.ts',
    original: '    io.exit(1);\n',
    mutant: '    io.exit(0);\n',
    commands: [
      ['test', '--', 'src/cli/aws-api-gateway-tools/launcher.test.ts'],
    ],
  },
  {
    name: 'host importMetaUrl is forwarded',
    file: 'src/cli/aws-api-gateway-tools/cliOptions.ts',
    original: '  importMetaUrl,\n',
    mutant: "  importMetaUrl: 'file:///wrong-host.js',\n",
    commands: [
      ['test', '--', 'src/cli/aws-api-gateway-tools/cliOptions.test.ts'],
    ],
  },
  {
    name: 'main entry stays independent of get-dotenv',
    file: 'src/index.ts',
    original: "export { assertLogger, type Logger } from './logger';\n",
    mutant:
      "export { assertLogger, type Logger } from './logger';\nexport { apiGatewayPlugin } from './apiGatewayPlugin/apiGatewayPlugin';\n",
    commands: [
      ['run', 'build'],
      ['run', 'verify:package'],
    ],
  },
  {
    name: 'main wrapper uses the local Logger type',
    file: 'src/apiGateway/AwsApiGatewayTools.ts',
    original: "import { assertLogger, type Logger } from '../logger';",
    mutant:
      "import { assertLogger, type Logger } from '@karmaniverous/get-dotenv';",
    commands: [
      ['run', 'build'],
      ['run', 'verify:types'],
    ],
  },
  {
    name: 'release naming template is exact',
    file: 'package.json',
    original: '"releaseName": "${name.split(\'/\').pop()}@${version}"',
    mutant: '"releaseName": "Release ${version}"',
    commands: [['test', '--', 'src/packageContract.test.ts']],
  },
  {
    name: 'get-dotenv subpath is exported',
    file: 'package.json',
    original: '"./get-dotenv": {',
    mutant: '"./mutated-get-dotenv": {',
    commands: [['test', '--', 'src/packageContract.test.ts']],
  },
  {
    name: 'zod remains a direct external dependency',
    file: 'src/apiGatewayPlugin/apiGatewayPluginConfig.ts',
    original: "import { z } from 'zod';",
    mutant: "import { z } from '@karmaniverous/get-dotenv/cliHost';",
    commands: [
      ['run', 'build'],
      ['run', 'verify:bundle'],
    ],
  },
];

const run = (args: string[]): number => {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: resolve(import.meta.dirname, '..'),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.error) throw result.error;
  if (result.status === null) {
    throw new Error(`npm ${args.join(' ')} ended without an exit status`);
  }
  return result.status;
};

let mutationError: unknown;
try {
  for (const mutation of mutations) {
    const path = resolve(import.meta.dirname, '..', mutation.file);
    const source = readFileSync(path, 'utf8');
    if (!source.includes(mutation.original)) {
      throw new Error(`mutation source not found: ${mutation.name}`);
    }

    let killed = false;
    try {
      writeFileSync(path, source.replace(mutation.original, mutation.mutant));
      for (const command of mutation.commands) {
        if (run(command) !== 0) {
          killed = true;
          break;
        }
      }
    } finally {
      writeFileSync(path, source);
    }

    if (!killed) throw new Error(`survived mutation: ${mutation.name}`);
    console.log(`killed: ${mutation.name}`);
  }
} catch (error) {
  mutationError = error;
}

if (run(['run', 'build']) !== 0 || run(['run', 'verify:bundle']) !== 0) {
  throw new Error('failed to restore the clean built bundle after mutations');
}
if (mutationError instanceof Error) throw mutationError;
if (typeof mutationError !== 'undefined') {
  throw new Error('mutation runner failed', { cause: mutationError });
}

console.log(
  `verify:mutations: ${String(mutations.length)}/${String(mutations.length)} killed`,
);
