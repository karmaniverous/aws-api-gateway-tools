/**
 * Requirements addressed:
 * - Provide an opt-in end-to-end smoke test that hits real AWS resources.
 * - Exercise:
 *   - `aws api-gateway flush-cache` (defaults via API_ID/API_NAME + STAGE_NAME)
 *   - `aws api-gateway pull-keys` (API_KEY_NAMES), writing to a template-bootstrapped dotenv file
 * - Use committed fixtures under smoke/fixtures and committed defaults under smoke/.env
 *   with optional overrides in smoke/.env.local.
 */

import {
  assertContains,
  assertSmokeFixturesPresent,
  expectCommandOk,
  findRepoRoot,
  getApiKeyNames,
  getAwsApiGatewayFixturePaths,
  getFlushCacheSelector,
  loadSmokeEnv,
  logCommandOk,
  rmrf,
  runAwsApiGatewayToolsCli,
  shouldKeepArtifacts,
  shouldRunApiGatewaySmoke,
  SMOKE_AWS_API_GATEWAY_FIXTURES_DIR_REL,
  SMOKE_TEMPLATE_SENTINEL,
} from './smokeLib';

const main = async (): Promise<void> => {
  console.log('smoke:flags: starting...');

  const repoRoot = await findRepoRoot(process.cwd());
  const smokeEnv = await loadSmokeEnv(repoRoot);
  if (!shouldRunApiGatewaySmoke(smokeEnv)) {
    console.log('smoke:flags: skipped (set SMOKE_APIGW=1 to enable).');
    return;
  }

  const profile = smokeEnv.SMOKE_AWS_PROFILE;
  if (!profile) {
    throw new Error(
      'SMOKE_AWS_PROFILE is missing; set it in smoke/.env.local.',
    );
  }
  const keepArtifacts = shouldKeepArtifacts(smokeEnv);
  const { apiId, apiName, stageName } = getFlushCacheSelector(smokeEnv);
  const keyNames = getApiKeyNames(smokeEnv);

  console.log(
    `smoke:flags: profile=${profile} stage=${stageName} apiId=${apiId ?? ''} apiName=${apiName ?? ''} keys=${String(keyNames.length)}`,
  );

  await assertSmokeFixturesPresent({ repoRoot });
  const fixtures = getAwsApiGatewayFixturePaths({ repoRoot });

  try {
    await rmrf(fixtures.localAbs);

    const rootArgs = ['--paths', SMOKE_AWS_API_GATEWAY_FIXTURES_DIR_REL];
    const awsArgs = ['aws', '--profile', profile, '--login-on-demand'];

    const flushRes = await runAwsApiGatewayToolsCli({
      repoRoot,
      env: smokeEnv,
      argv: [...rootArgs, ...awsArgs, 'api-gateway', 'flush-cache'],
    });
    expectCommandOk(flushRes, 'cli-flags: flush-cache');
    logCommandOk(flushRes, 'cli-flags: flush-cache');

    const pullRes = await runAwsApiGatewayToolsCli({
      repoRoot,
      env: smokeEnv,
      argv: [
        ...rootArgs,
        ...awsArgs,
        'api-gateway',
        'pull-keys',
        '--key-names',
        ...keyNames,
        '--to',
        'global:private',
      ],
    });
    expectCommandOk(pullRes, 'cli-flags: pull-keys');
    logCommandOk(pullRes, 'cli-flags: pull-keys');

    const localText = await (
      await import('./smokeLib')
    ).readText(fixtures.localAbs);
    assertContains(
      localText,
      SMOKE_TEMPLATE_SENTINEL,
      'expected .env.local to be bootstrapped from template and preserve comments',
    );
    assertContains(localText, 'API_KEYS=', 'expected API_KEYS to be present');
    if (keyNames.length > 1) {
      assertContains(localText, ', ', 'expected default delimiter ", "');
    }
  } finally {
    if (!keepArtifacts) await rmrf(fixtures.localAbs);
  }

  console.log('smoke:flags: done.');
};

await main();
