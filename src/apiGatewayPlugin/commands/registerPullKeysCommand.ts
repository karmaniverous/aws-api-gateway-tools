/**
 * Requirements addressed:
 * - Provide `aws api-gateway pull-keys`.
 * - Accept `--key-names <string...>` (space-delimited list).
 * - Missing keys fail the whole command, unless `--if-exists` is set.
 * - `--if-exists` (config: `pullKeys.ifExists`, default `false`): skip
 *   missing keys (exact-name match only) with a warning instead of failing;
 *   if none of the requested keys exist, leave the target variable
 *   untouched.
 * - `--vars VAR=keyName ...` (config: `pullKeys.vars`): write several
 *   variables in one call. Pairs follow the root `--vars` syntax (root
 *   delimiter / assignor settings honored); a repeated variable collects its
 *   keys. Mutually exclusive with `--key-names` / `--variable-name`; with
 *   `--if-exists`, a variable whose keys are all missing is left untouched.
 * - Join values by `--delimiter` (default: ", ").
 * - Write result to a single dotenv variable (`--variable-name`, default: API_KEYS)
 *   in the target selected by `--to <scope:privacy>` (default env:private).
 */

import {
  buildSpawnEnv,
  dotenvExpand,
  editDotenvFile,
  getDotenvCliOptions2Options,
  requireString,
  silentLogger,
} from '@karmaniverous/get-dotenv';
import { readMergedOptions } from '@karmaniverous/get-dotenv/cliHost';
import { getAwsRegion } from '@karmaniverous/get-dotenv/plugins/aws';

import { AwsApiGatewayTools } from '../../apiGateway/AwsApiGatewayTools';
import { parseToSelector } from '../dotenvSelectors';
import {
  resolveCliVarsTargets,
  resolveConfigVarsTargets,
  type VarsTargets,
} from './resolveVarsTargets';
import type { ApiGatewayPluginApi, ApiGatewayPluginCli } from './types';

export const registerPullKeysCommand = ({
  cli,
  plugin,
}: {
  cli: ApiGatewayPluginCli;
  plugin: ApiGatewayPluginApi;
}): void => {
  const pull = cli
    .ns('pull-keys')
    .description(
      'Write API key values into a dotenv variable (delimiter-joined).',
    );

  pull
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '--key-names <strings...>',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.pullKeys?.keyNames?.length
            ? pluginCfg.pullKeys.keyNames.join(' ')
            : 'none';
          return `space-delimited list of API key names (supports $VAR expansion per name) (default: ${def})`;
        },
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '--variable-name <string>',
        (_helpCfg, pluginCfg) =>
          `dotenv variable to write (default: ${pluginCfg.pullKeys?.variableName ?? 'API_KEYS'})`,
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '--vars <pairs...>',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.pullKeys?.vars
            ? Object.entries(pluginCfg.pullKeys.vars)
                .flatMap(([variable, names]) =>
                  (Array.isArray(names) ? names : [names]).map(
                    (name) => `${variable}=${name}`,
                  ),
                )
                .join(' ')
            : 'none';
          return `VAR=keyName pairs: write the value of the API key NAMED keyName to dotenv variable VAR; pairs follow the root --vars syntax (supports $VAR expansion); a repeated VAR collects keys joined by --delimiter; not with --key-names/--variable-name (default: ${def})`;
        },
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '--delimiter <string>',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.pullKeys?.delimiter ?? ', ';
          return `delimiter for joining key values (default: ${def})`;
        },
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '--to <scope:privacy>',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.pullKeys?.to ?? 'env:private';
          return `destination dotenv selector (global|env):(public|private) (default: ${def})`;
        },
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '-t, --template-extension <string>',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.templateExtension ?? 'template';
          return `dotenv template extension used when target file is missing (default: ${def})`;
        },
      ),
    )
    .addOption(
      plugin.createPluginDynamicOption(
        pull,
        '--if-exists',
        (_helpCfg, pluginCfg) => {
          const def = pluginCfg.pullKeys?.ifExists ? 'true' : 'false';
          return `skip missing API keys (exact-name match only) with a warning instead of failing; leaves the target variable untouched if none are found (default: ${def})`;
        },
      ),
    )
    .action(async (opts, command) => {
      const logger = console;
      const ctx = cli.getCtx();
      const bag = readMergedOptions(command);
      const rootOpts = getDotenvCliOptions2Options(bag);
      const cfg = plugin.readConfig(pull);
      const sdkLogger = bag.debug ? console : silentLogger;

      const paths = rootOpts.paths ?? ['./'];
      const dotenvToken = rootOpts.dotenvToken ?? '.env';
      const privateToken = rootOpts.privateToken ?? 'local';

      const toRaw = opts.to ?? cfg.pullKeys?.to ?? 'env:private';
      const to = parseToSelector(toRaw);

      const envRef = buildSpawnEnv(process.env, ctx.dotenv);
      const expand = (raw: string) => dotenvExpand(raw, envRef);

      const keyNamesFromConfig = (): string[] => {
        const keyNamesRaw =
          (Array.isArray(opts.keyNames) && opts.keyNames.length
            ? opts.keyNames
            : undefined) ??
          cfg.pullKeys?.keyNames ??
          [];
        if (!keyNamesRaw.length) throw new Error('key-names is required.');
        return keyNamesRaw.map((raw) => {
          const expanded = expand(raw);
          if (!expanded) {
            throw new Error(
              'key-names contains an empty value after expansion.',
            );
          }
          return expanded;
        });
      };
      const singleTarget = (): VarsTargets =>
        new Map([
          [
            opts.variableName ?? cfg.pullKeys?.variableName ?? 'API_KEYS',
            keyNamesFromConfig(),
          ],
        ]);

      const cliVars = Array.isArray(opts.vars) && opts.vars.length > 0;
      const cliKeyMode =
        (Array.isArray(opts.keyNames) && opts.keyNames.length > 0) ||
        opts.variableName !== undefined;
      let targets: VarsTargets;
      if (cliVars) {
        if (cliKeyMode) {
          throw new Error(
            '--vars cannot be combined with --key-names or --variable-name.',
          );
        }
        targets = resolveCliVarsTargets(opts.vars ?? [], expand, {
          varsAssignor: bag.varsAssignor,
          varsAssignorPattern: bag.varsAssignorPattern,
          varsDelimiter: bag.varsDelimiter,
          varsDelimiterPattern: bag.varsDelimiterPattern,
        });
      } else if (!cliKeyMode && cfg.pullKeys?.vars) {
        if (cfg.pullKeys.keyNames || cfg.pullKeys.variableName) {
          throw new Error(
            'pullKeys.vars cannot be combined with pullKeys.keyNames or pullKeys.variableName.',
          );
        }
        targets = resolveConfigVarsTargets(cfg.pullKeys.vars, expand);
      } else {
        targets = singleTarget();
      }

      const delimiter = opts.delimiter ?? cfg.pullKeys?.delimiter ?? ', ';
      const ifExists = opts.ifExists ?? cfg.pullKeys?.ifExists ?? false;

      const region = getAwsRegion(ctx);
      const tools = new AwsApiGatewayTools({
        clientConfig: region
          ? { region, logger: sdkLogger }
          : { logger: sdkLogger },
      });

      const total = [...targets.values()].reduce(
        (n, names) => n + names.length,
        0,
      );
      logger.info(`Retrieving ${String(total)} API key(s) from API Gateway...`);
      let missing = 0;
      const updates: Record<string, string> = {};
      for (const [variable, keyNames] of targets) {
        const values = await tools.getApiKeyValuesByNames({
          keyNames,
          ifExists,
          onMissing: (name) => {
            missing += 1;
            logger.warn(`API key '${name}' not found: skipping`);
          },
        });
        if (values.length) updates[variable] = values.join(delimiter);
      }

      if (missing) {
        logger.warn(
          `${String(missing)} of ${String(total)} API keys not found.`,
        );
      }
      if (!Object.keys(updates).length) {
        logger.info(
          'No requested API keys were found; leaving target variables untouched.',
        );
        return;
      }

      const templateExtension =
        opts.templateExtension ?? cfg.templateExtension ?? 'template';

      const editCommon = {
        paths,
        dotenvToken,
        privateToken,
        privacy: to.privacy,
        templateExtension,
      };

      const res =
        to.scope === 'env'
          ? await editDotenvFile(updates, {
              ...editCommon,
              scope: 'env',
              env: requireString(
                bag.env,
                'env is required (use --env or defaultEnv).',
              ),
            })
          : await editDotenvFile(updates, {
              ...editCommon,
              scope: 'global',
            });

      logger.info(`Updated ${res.path}`);
    });
};
