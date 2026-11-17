---
title: Assistant integration guide
---

# AWS API Gateway Tools assistant guide

Use this package through two deliberately separate public entries.

## Core library

Import the API Gateway wrapper from the package root. This entry does not load the optional get-dotenv peer.

```ts
import {
  AwsApiGatewayTools,
  type Logger,
} from '@karmaniverous/aws-api-gateway-tools';

const logger: Logger = console;
const tools = new AwsApiGatewayTools({
  clientConfig: { region: 'us-east-1', logger },
  xray: 'off',
});
```

The wrapper exposes `client`, `clientConfig`, `logger`, and `xray`. Convenience methods list REST APIs and API keys, flush a stage cache by id or name, and retrieve key values by exact names.

## get-dotenv integration

Install get-dotenv separately because it is an optional peer:

```bash
npm i -D @karmaniverous/get-dotenv@^8.0.0
```

Import the plugin and its config schema only from the subpath:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import {
  apiGatewayPlugin,
  apiGatewayPluginConfigSchema,
  type ApiGatewayPluginConfig,
} from '@karmaniverous/aws-api-gateway-tools/get-dotenv';

await createCli({
  alias: 'toolbox',
  importMetaUrl: import.meta.url,
  compose: (program) => program.use(awsPlugin().use(apiGatewayPlugin())),
})();
```

The plugin mounts `aws api-gateway flush-cache` and `aws api-gateway pull-keys`. Region and credentials come from the parent `aws` plugin and the AWS SDK provider chain.

This is a breaking layout change: `apiGatewayPlugin`, `apiGatewayPluginConfigSchema`, and `ApiGatewayPluginConfig` are no longer exported from the package root.

## Standalone CLI

The `aws-api-gateway-tools` bin dynamically loads its get-dotenv-backed runner. If the optional peer is absent, it exits 1 and prints local, global, and `npx` installation routes instead of a module-resolution stack trace.

```bash
aws-api-gateway-tools aws api-gateway flush-cache
aws-api-gateway-tools aws api-gateway pull-keys --key-names key-a key-b
```

## Related docs

- [README](../README.md)
- [Programmatic guide](./aws-api-gateway-tools.md)
- [Plugin guide](./api-gateway-plugin.md)
- [Smoke guide](../smoke/README.md)
