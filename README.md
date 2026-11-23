# AWS API Gateway Tools

[![npm version](https://img.shields.io/npm/v/@karmaniverous/aws-api-gateway-tools.svg)](https://www.npmjs.com/package/@karmaniverous/aws-api-gateway-tools) ![Node Current](https://img.shields.io/node/v/@karmaniverous/aws-api-gateway-tools) [![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/aws-api-gateway-tools) [![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](./CHANGELOG.md) [![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](./LICENSE)

Tools and a get-dotenv plugin for working with AWS API Gateway (REST APIs), including stage cache flush and API key retrieval.

This package provides:

- A tools-style wrapper that owns AWS client setup (including optional AWS X-Ray capture):
  - `AwsApiGatewayTools`
- A get-dotenv plugin intended to be mounted under `aws`:
  - `apiGatewayPlugin()` from `@karmaniverous/aws-api-gateway-tools/get-dotenv` → `aws api-gateway flush-cache|pull-keys`
- A CLI embedding get-dotenv with the api-gateway plugin:
  - `aws-api-gateway-tools`

## Documentation

- Learn the programmatic API: [AwsApiGatewayTools guide](guides/aws-api-gateway-tools.md)
- Learn the CLI and plugin behavior: [aws api-gateway plugin guide](guides/api-gateway-plugin.md)
- Browse the generated API reference: [TypeDoc site](https://docs.karmanivero.us/aws-api-gateway-tools)

## Install

```bash
npm i @karmaniverous/aws-api-gateway-tools
```

The library root does not require get-dotenv. To use the plugin or standalone CLI, install the optional peer:

```bash
npm i -D @karmaniverous/get-dotenv@^8.0.0
```

This package is ESM-only (Node >= 22.12).

## Quick start (programmatic)

```ts
import { AwsApiGatewayTools } from '@karmaniverous/aws-api-gateway-tools';

const tools = new AwsApiGatewayTools({
  clientConfig: { region: 'us-east-1', logger: console },
  xray: 'auto',
});

await tools.flushStageCache({ restApiId: 'abc123', stageName: 'dev' });
```

When you need AWS functionality not wrapped by this package, use the fully configured AWS SDK v3 client at `tools.client` (see the [programmatic guide](guides/aws-api-gateway-tools.md) for examples).

## Quick start (CLI)

```bash
aws-api-gateway-tools aws api-gateway flush-cache
aws-api-gateway-tools aws api-gateway pull-keys --key-names '$API_KEY_A' '$API_KEY_B'
aws-api-gateway-tools aws api-gateway pull-keys --vars SELF_API_KEY=my-key OTHER_API_KEY=other-key --if-exists
```

Notes:

- `pull-keys --vars VAR=keyName ...` writes several variables in one call; pairs follow the root `--vars` syntax. See the [plugin guide](guides/api-gateway-plugin.md).

- If get-dotenv is absent, the bin exits 1 and prints local, global, and `npx` installation routes.
- Relevant flags support `$VAR` expansion evaluated at action time against `{ ...process.env, ...ctx.dotenv }` (`ctx.dotenv` wins).

## Quick start (plugin host)

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { apiGatewayPlugin } from '@karmaniverous/aws-api-gateway-tools/get-dotenv';

await createCli({
  alias: 'my-cli',
  importMetaUrl: import.meta.url,
  compose: (program) => program.use(awsPlugin().use(apiGatewayPlugin())),
})();
```

## Migrating to the next minor

The get-dotenv integration is now isolated from the package root. Imports of `apiGatewayPlugin`, `apiGatewayPluginConfigSchema`, and `ApiGatewayPluginConfig` are breaking changes:

```ts
// Before
import { apiGatewayPlugin } from '@karmaniverous/aws-api-gateway-tools';

// Now
import { apiGatewayPlugin } from '@karmaniverous/aws-api-gateway-tools/get-dotenv';
```

The root exports only the independent API Gateway tools and local `Logger` contract.

## AWS X-Ray capture (optional)

X-Ray support is guarded:

- Default behavior is `xray: 'auto'`: capture is enabled only when `AWS_XRAY_DAEMON_ADDRESS` is set.
- To enable capture, install the optional peer dependency:
  - `aws-xray-sdk`
- In `auto` mode, if `AWS_XRAY_DAEMON_ADDRESS` is set but `aws-xray-sdk` is not installed, construction throws.

## Config defaults (getdotenv.config.\*)

If you embed the plugin in your own get-dotenv host (or use the shipped CLI), you can provide safe defaults in config under `plugins['aws/api-gateway']`:

```jsonc
{
  "plugins": {
    "aws/api-gateway": {
      "apiId": "$API_ID",
      "apiName": "$API_NAME",
      "stageName": "$STAGE_NAME",
      "templateExtension": "template",
      "pullKeys": { "to": "env:private", "delimiter": ", ", "ifExists": false },
    },
  },
}
```

See the [api-gateway plugin guide](guides/api-gateway-plugin.md) for supported config keys and CLI behavior.

---

Built for you with ❤️ on Bali! Find more great tools & templates on [my GitHub Profile](https://github.com/karmaniverous).
