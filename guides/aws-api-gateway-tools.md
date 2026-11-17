---
title: AwsApiGatewayTools
---

# AwsApiGatewayTools (programmatic API)

This guide explains how to use `AwsApiGatewayTools` as a small, opinionated wrapper around AWS API Gateway (REST APIs).

If you’re looking for the CLI or plugin behavior instead, see the [aws api-gateway plugin guide](./api-gateway-plugin.md).

## Install and import

```bash
npm i @karmaniverous/aws-api-gateway-tools
```

This package is ESM-only (Node >= 22.12). The package root is independent of the optional get-dotenv peer.

```ts
import { AwsApiGatewayTools } from '@karmaniverous/aws-api-gateway-tools';
```

## Initialize once: `new AwsApiGatewayTools(...)`

Create a configured instance (recommended usage):

```ts
import { AwsApiGatewayTools } from '@karmaniverous/aws-api-gateway-tools';

const tools = new AwsApiGatewayTools({
  clientConfig: {
    region: 'us-east-1',
    logger: console,
  },
  xray: 'auto',
});
```

### Constructor options

`new AwsApiGatewayTools({ ... })` accepts:

- `clientConfig?: APIGatewayClientConfig`
  - Any AWS SDK v3 API Gateway client configuration (region, credentials, retry options, etc.).
  - If `clientConfig.logger` is provided, it must implement `debug`, `info`, `warn`, and `error` (the package's local `Logger` contract, compatible with AWS SDK v3 and get-dotenv). The wrapper validates this contract up front (it does not polyfill missing methods).
- `xray?: 'auto' | 'on' | 'off'`
  - `'auto'` (default): enable only when `AWS_XRAY_DAEMON_ADDRESS` is set.
  - `'on'`: force capture (requires `AWS_XRAY_DAEMON_ADDRESS` and `aws-xray-sdk`).
  - `'off'`: never enable capture.

### Observability and diagnostics

The instance exposes a few helpful properties:

- `tools.client`: the effective `APIGatewayClient` (captured/instrumented when X-Ray is enabled)
- `tools.clientConfig`: the effective config used to construct the base client
- `tools.logger`: the validated console-like logger
- `tools.xray`: `{ mode, enabled, daemonAddress? }` reflecting the effective runtime decision

## Escape hatch: use the raw AWS SDK client

When you need API Gateway APIs that aren’t wrapped by this package, use `tools.client` directly and import AWS SDK command classes as needed:

```ts
import { GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import { AwsApiGatewayTools } from '@karmaniverous/aws-api-gateway-tools';

const tools = new AwsApiGatewayTools({
  clientConfig: { region: 'us-east-1', logger: console },
});

const res = await tools.client.send(new GetRestApisCommand({ limit: 25 }));
console.log(res.items?.length ?? 0);
```

## Convenience methods

### Flush stage cache: `flushStageCache(...)`

Flush a REST API stage cache by id:

```ts
await tools.flushStageCache({ restApiId: 'abc123', stageName: 'dev' });
```

### Flush stage cache by name: `flushStageCacheByName(...)`

Resolve REST API id by name and flush:

```ts
const { apiId } = await tools.flushStageCacheByName({
  apiName: 'my-api',
  stageName: 'dev',
});
console.log('flushed', apiId);
```

### Retrieve API key values: `getApiKeyValuesByNames(...)`

Retrieve API key values by key names (strict: missing/ambiguous keys throw):

```ts
const values = await tools.getApiKeyValuesByNames({
  keyNames: ['my-api-key-a', 'my-api-key-b'],
});
console.log(values.join(', '));
```

## AWS X-Ray capture (optional)

X-Ray capture is guarded:

- Install the optional peer dependency if you want capture:
  - `aws-xray-sdk`
- In `'auto'` mode, capture is enabled only when `AWS_XRAY_DAEMON_ADDRESS` is set.
- In `'auto'` mode, if the daemon address is set but `aws-xray-sdk` is not installed, construction throws with a clear error message.

## Next steps

- For the CLI/plugin workflow (`aws api-gateway flush-cache|pull-keys`), see the [aws api-gateway plugin guide](./api-gateway-plugin.md).
- For a short package overview, see the [README](../README.md).
