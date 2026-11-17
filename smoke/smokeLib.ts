/** Shared helpers for the opt-in API Gateway smoke tests. */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { ProcessEnv } from '@karmaniverous/get-dotenv';
import { getDotenv } from '@karmaniverous/get-dotenv';

const require = createRequire(import.meta.url);

export type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export const fileExists = async (p: string): Promise<boolean> => {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
};

export const mkdirp = async (p: string): Promise<void> => {
  await fs.mkdir(p, { recursive: true });
};

export const rmrf = async (p: string): Promise<void> => {
  await fs.rm(p, { recursive: true, force: true });
};

export const readText = async (p: string): Promise<string> =>
  await fs.readFile(p, 'utf8');

export const assert = (cond: unknown, msg: string): void => {
  if (!cond) throw new Error(msg);
};

export const assertContains = (
  haystack: string,
  needle: string,
  msg: string,
) => {
  assert(haystack.includes(needle), msg);
};

export const findRepoRoot = async (startDir: string): Promise<string> => {
  let cur = path.resolve(startDir);
  for (let i = 0; i < 12; i++) {
    const candidate = path.join(cur, 'package.json');
    if (await fileExists(candidate)) return cur;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error(`Could not find repo root from ${startDir}`);
};

export const runProcess = async ({
  cwd,
  cmd,
  args,
  env,
}: {
  cwd: string;
  cmd: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}): Promise<RunResult> =>
  await new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += String(d)));
    child.stderr.on('data', (d) => (stderr += String(d)));
    child.on('close', (code) => {
      resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr });
    });
  });

const toChildProcessEnv = ({
  base,
  extra,
}: {
  base: NodeJS.ProcessEnv;
  extra?: ProcessEnv;
}): NodeJS.ProcessEnv => {
  const unset = new Set<string>();
  const setEntries: Array<[string, string]> = [];

  for (const [k, v] of Object.entries(extra ?? {})) {
    if (typeof v === 'string') setEntries.push([k, v]);
    else unset.add(k);
  }

  const baseEntries: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(base)) {
    if (typeof v === 'string' && !unset.has(k)) baseEntries.push([k, v]);
  }

  // child_process.spawn requires env values to be strings; we only emit strings.
  return Object.fromEntries([...baseEntries, ...setEntries]);
};

export const loadSmokeEnv = async (repoRoot: string): Promise<ProcessEnv> => {
  // Load committed defaults from smoke/.env plus optional overrides from
  // smoke/.env.local (gitignored).
  return await getDotenv({
    paths: [path.resolve(repoRoot, 'smoke')],
    dotenvToken: '.env',
    privateToken: 'local',
    loadProcess: false,
  });
};

export const shouldKeepArtifacts = (smokeEnv: ProcessEnv): boolean =>
  smokeEnv.SMOKE_KEEP_ARTIFACTS === '1';

export const runAwsApiGatewayToolsCli = async ({
  repoRoot,
  argv,
  env,
}: {
  repoRoot: string;
  argv: string[];
  env?: ProcessEnv;
}): Promise<RunResult> => {
  const entry = path.resolve(
    repoRoot,
    'src/cli/aws-api-gateway-tools/index.ts',
  );

  return await runProcess({
    cwd: repoRoot,
    // Invoke Node with tsx's public CLI export. This avoids shell interpolation
    // and works consistently across Windows and POSIX.
    cmd: process.execPath,
    args: [require.resolve('tsx/cli'), entry, ...argv],
    env: toChildProcessEnv({
      base: { ...process.env, NO_COLOR: '1' },
      extra: env,
    }),
  });
};

export const shouldRunApiGatewaySmoke = (smokeEnv: ProcessEnv): boolean =>
  smokeEnv.SMOKE_APIGW === '1';

export const SMOKE_AWS_API_GATEWAY_FIXTURES_DIR_REL =
  'smoke/fixtures/aws-api-gateway';
export const SMOKE_OVERLAY_CONFIG_FIXTURE_REL =
  'smoke/fixtures/getdotenv.config.overlay.json';
export const SMOKE_TEMPLATE_SENTINEL = '# smoke template comment: keep me';

export const getAwsApiGatewayFixturePaths = ({
  repoRoot,
}: {
  repoRoot: string;
}): {
  envAbs: string;
  templateAbs: string;
  localAbs: string;
} => {
  const dirAbs = path.resolve(repoRoot, SMOKE_AWS_API_GATEWAY_FIXTURES_DIR_REL);
  const envAbs = path.join(dirAbs, '.env');
  const templateAbs = path.join(dirAbs, '.env.local.template');
  const localAbs = path.join(dirAbs, '.env.local');
  return { envAbs, templateAbs, localAbs };
};

export const assertSmokeFixturesPresent = async ({
  repoRoot,
}: {
  repoRoot: string;
}): Promise<void> => {
  const { envAbs, templateAbs } = getAwsApiGatewayFixturePaths({ repoRoot });
  assert(await fileExists(envAbs), `Missing smoke fixture: ${envAbs}`);
  assert(
    await fileExists(templateAbs),
    `Missing smoke fixture: ${templateAbs}`,
  );

  const templateText = await readText(templateAbs);
  assertContains(
    templateText,
    SMOKE_TEMPLATE_SENTINEL,
    'Smoke template missing sentinel comment; update SMOKE_TEMPLATE_SENTINEL or template content.',
  );
};

export const requireEnv = (env: ProcessEnv, key: string): string => {
  const v = env[key];
  if (typeof v === 'string' && v.length) return v;
  throw new Error(`Missing required env var: ${key}`);
};

export const getFlushCacheSelector = (
  env: ProcessEnv,
): { apiId?: string; apiName?: string; stageName: string } => {
  const stageName = requireEnv(env, 'STAGE_NAME');
  const apiId = env.API_ID;
  const apiName = env.API_NAME;
  if (!apiId && !apiName) {
    throw new Error('Missing API_ID and API_NAME (need at least one).');
  }
  return { apiId, apiName, stageName };
};

export const getApiKeyNames = (env: ProcessEnv): string[] => {
  const raw = requireEnv(env, 'API_KEY_NAMES');
  return raw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

export const expectCommandOk = (res: RunResult, label: string): void => {
  if (res.code === 0) return;
  throw new Error(
    `${label} failed with code ${String(res.code)}\n` +
      `--- stdout ---\n${res.stdout}\n` +
      `--- stderr ---\n${res.stderr}\n`,
  );
};

export const logCommandOk = (res: RunResult, label: string): void => {
  // Keep smoke runs visibly “alive” without spamming.
  // Opt into child output with SMOKE_VERBOSE=1.
  console.log(`${label}: ok`);

  if (process.env.SMOKE_VERBOSE !== '1') return;

  const clip = (s: string, limit = 8_000): string =>
    s.length > limit ? `${s.slice(0, limit)}\n[truncated]` : s;

  if (res.stdout.trim()) console.log(`--- stdout ---\n${clip(res.stdout)}`);
  if (res.stderr.trim()) console.log(`--- stderr ---\n${clip(res.stderr)}`);
};
