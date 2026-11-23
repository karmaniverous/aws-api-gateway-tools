---
title: get-dotenv plugin
---

# aws api-gateway plugin (get-dotenv)

This guide explains the get-dotenv API Gateway plugin exported by this package:

- `apiGatewayPlugin()` → mounts under `aws` and provides:
  - `aws api-gateway flush-cache`
  - `aws api-gateway pull-keys`

If you want the programmatic API instead, see the [AwsApiGatewayTools guide](./aws-api-gateway-tools.md).

## Install and import

```bash
npm i @karmaniverous/aws-api-gateway-tools
npm i -D @karmaniverous/get-dotenv@^8.0.0
```

You can either:

- Use the shipped CLI (`aws-api-gateway-tools`), or
- Embed `apiGatewayPlugin()` inside your own get-dotenv host.

## Using the shipped CLI

The shipped CLI is a get-dotenv CLI host composed with `aws` + `api-gateway`:

```bash
aws-api-gateway-tools aws api-gateway flush-cache
aws-api-gateway-tools aws api-gateway pull-keys --key-names '$API_KEY_A' '$API_KEY_B'
```

Notes:

- Relevant flags support `$VAR` expansion evaluated at action time against `{ ...process.env, ...ctx.dotenv }` (`ctx.dotenv` wins).

## Embedding the plugin in your own host

Mount the plugin under `aws`:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';

import { apiGatewayPlugin } from '@karmaniverous/aws-api-gateway-tools/get-dotenv';

await createCli({
  alias: 'toolbox',
  importMetaUrl: import.meta.url,
  compose: (program) => program.use(awsPlugin().use(apiGatewayPlugin())),
})();
```

The plugin, `apiGatewayPluginConfigSchema`, and `ApiGatewayPluginConfig` moved from the package root to `/get-dotenv` in this breaking package-layout change. The root remains importable when the optional peer is absent.

Region sourcing:

- The plugin reads the effective region from the aws plugin’s published ctx state (`ctx.plugins.aws.region`) when available.
- Credentials are expected to come from the standard AWS SDK v3 provider chain (the parent `aws` plugin may export them into `process.env` depending on its configuration).

## `aws api-gateway flush-cache`

Flushes a REST API stage cache.

Flags:

- `--api-id <string>`: REST API id (conflicts with `--api-name`)
  - Default fallback when omitted: `$API_ID`
- `--api-name <string>`: REST API name (conflicts with `--api-id`)
  - Default fallback when omitted: `$API_NAME`
- `--stage-name <string>`: stage name
  - Default fallback when omitted: `$STAGE_NAME`

All three support `$VAR` expansion at action time.

If `api-id` resolves, the plugin flushes directly; otherwise it resolves the REST API id by name and then flushes.

## `aws api-gateway pull-keys`

Retrieves one or more API key values and writes them into a dotenv variable as a delimiter-joined string.

Flags:

- `--key-names <string...>` (required): space-delimited list of API key names
- `--variable-name <string>` (default `API_KEYS`): dotenv variable name to write
- `--delimiter <string>` (default `", "`): delimiter used to join values
- `--to <scope:privacy>` (default `env:private`): destination dotenv selector
- `--template-extension <string>` (default `template`): bootstrap extension
- `--if-exists` (config `pullKeys.ifExists`, default `false`): skip missing keys with a warning instead of failing the whole command

Key behavior:

- Key names are expanded at action time (per name).
- Key lookup requires an **exact** name match. AWS API Gateway's `GetApiKeys` `nameQuery` is a _prefix_ match, so a key named `api-user-v1-spokane-foo` will no longer be returned (and silently used) when you ask for `api-user-v1-spokane`.
- Missing keys fail the whole command, unless `--if-exists` is set.
- With `--if-exists`, each missing key (by exact name) prints a warning (`API key '<name>' not found: skipping`) and is omitted from the joined value; every other failure (credentials, throttling, an ambiguous exact match, or a key with no value) still fails the command. If **none** of the requested keys exist, the target dotenv variable is left untouched (not written or blanked).
- Dotenv editing is format-preserving (winner-path selection) and supports template bootstrap.

## Related docs

- Package overview: see the [README](../README.md).
- Programmatic API: see the [AwsApiGatewayTools guide](./aws-api-gateway-tools.md).
