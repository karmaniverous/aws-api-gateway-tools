/**
 * Requirements addressed:
 * - Provide `aws api-gateway pull-keys`.
 * - Accept `--key-names <string...>` (space-delimited list).
 * - Missing keys fail the whole command.
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
      const keyNamesRaw =
        (Array.isArray(opts.keyNames) && opts.keyNames.length
          ? opts.keyNames
          : undefined) ??
        cfg.pullKeys?.keyNames ??
        [];
      if (!keyNamesRaw.length) throw new Error('key-names is required.');

      const keyNames = keyNamesRaw.map((raw) => {
        const expanded = dotenvExpand(raw, envRef);
        if (!expanded) {
          throw new Error('key-names contains an empty value after expansion.');
        }
        return expanded;
      });

      const variableName =
        opts.variableName ?? cfg.pullKeys?.variableName ?? 'API_KEYS';
      const delimiter = opts.delimiter ?? cfg.pullKeys?.delimiter ?? ', ';

      const region = getAwsRegion(ctx);
      const tools = new AwsApiGatewayTools({
        clientConfig: region
          ? { region, logger: sdkLogger }
          : { logger: sdkLogger },
      });

      logger.info(
        `Retrieving ${String(keyNames.length)} API key(s) from API Gateway...`,
      );
      const values = await tools.getApiKeyValuesByNames({ keyNames });
      const joined = values.join(delimiter);

      const templateExtension =
        opts.templateExtension ?? cfg.templateExtension ?? 'template';

      const updates = { [variableName]: joined };
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
