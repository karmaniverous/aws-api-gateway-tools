/**
 * Requirements addressed:
 * - Provide a public tools-style wrapper `AwsApiGatewayTools`.
 * - Consumers construct `new AwsApiGatewayTools(...)` and use convenience methods,
 *   with an escape hatch via `tools.client`.
 * - Support optional AWS X-Ray capture via \@karmaniverous/aws-xray-tools (guarded).
 * - Enforce the get-dotenv minimal Logger contract (debug/info/warn/error).
 * - Provide convenience methods that back the api-gateway plugin:
 *   - flush stage cache by API id or by API name
 *   - retrieve API key values by key names (strict missing/ambiguity errors)
 */

import {
  APIGatewayClient,
  type APIGatewayClientConfig,
  FlushStageCacheCommand,
  GetApiKeysCommand,
  GetRestApisCommand,
} from '@aws-sdk/client-api-gateway';
import {
  captureAwsSdkV3Client,
  shouldEnableXray,
  type XrayMode,
  type XrayState,
} from '@karmaniverous/aws-xray-tools';

import { assertLogger, type Logger } from '../logger';
import type {
  ApiGatewayPort,
  ApiKeySummary,
  RestApiSummary,
} from './ports/apiGatewayPort';
import { getApiKeyValuesByNames } from './services/getApiKeyValuesByNames';
import { resolveRestApiIdByName } from './services/resolveRestApiIdByName';

/** Options for {@link AwsApiGatewayTools} construction. */
export type AwsApiGatewayToolsOptions = {
  /**
   * AWS SDK v3 API Gateway client config.
   *
   * Include advanced settings here (region, credentials, retry config, custom
   * endpoint, etc.). If a logger is provided, it must implement
   * debug/info/warn/error.
   */
  clientConfig?: APIGatewayClientConfig;
  /**
   * AWS X-Ray capture mode.
   *
   * - `auto` (default): enable only when `AWS_XRAY_DAEMON_ADDRESS` is set.
   * - `on`: force enable (throws if daemon address is missing).
   * - `off`: disable.
   */
  xray?: XrayMode;
};

/**
 * Result of {@link AwsApiGatewayTools.flushStageCacheByName}.
 */
export type FlushStageCacheByNameResult = {
  /**
   * The resolved REST API id used for the flush operation.
   */
  apiId: string;
};

/**
 * Tools-style AWS API Gateway wrapper (REST APIs).
 *
 * Consumers should typically use the convenience methods on this class, and
 * use {@link AwsApiGatewayTools.client} as an escape hatch when they need
 * AWS SDK operations not wrapped here.
 */
export class AwsApiGatewayTools implements ApiGatewayPort {
  /**
   * The effective SDK client (captured when X-Ray is enabled).
   *
   * Import AWS SDK `*Command` classes as needed and call `tools.client.send(...)`.
   */
  public readonly client: APIGatewayClient;
  /**
   * The effective client config used to construct the base client.
   *
   * Note: this may contain functions/providers (e.g., credential providers).
   */
  public readonly clientConfig: APIGatewayClientConfig;
  /** The logger used by this wrapper and (when applicable) by the AWS client. */
  public readonly logger: Logger;
  /** Materialized X-Ray state (mode + enabled + daemonAddress when relevant). */
  public readonly xray: XrayState;

  /**
   * Construct an `AwsApiGatewayTools` instance.
   *
   * @throws If `clientConfig.logger` is provided but does not implement
   * `debug`, `info`, `warn`, and `error`.
   * @throws If X-Ray capture is enabled (via `xray: 'on'` or `xray: 'auto'`
   * with `AWS_XRAY_DAEMON_ADDRESS` set) but `aws-xray-sdk` is not installed.
   * @throws If X-Ray capture is requested but `AWS_XRAY_DAEMON_ADDRESS` is not set.
   */
  constructor({
    clientConfig = {},
    xray: xrayMode = 'auto',
  }: AwsApiGatewayToolsOptions = {}) {
    const logger = assertLogger(clientConfig.logger ?? console);

    const effectiveClientConfig: APIGatewayClientConfig = {
      ...clientConfig,
      logger,
    };

    const base = new APIGatewayClient(effectiveClientConfig);
    const daemonAddress = process.env.AWS_XRAY_DAEMON_ADDRESS;
    const enabled = shouldEnableXray(xrayMode, daemonAddress);
    const xrayState: XrayState = {
      mode: xrayMode,
      enabled,
      ...(enabled && daemonAddress ? { daemonAddress } : {}),
    };

    const effectiveClient = enabled
      ? captureAwsSdkV3Client(base, {
          mode: xrayMode,
          logger,
          daemonAddress,
        })
      : base;

    this.client = effectiveClient;
    this.clientConfig = effectiveClientConfig;
    this.logger = logger;
    this.xray = xrayState;
  }

  /**
   * List REST APIs (paginated).
   */
  async listRestApis(opts?: { limit?: number }): Promise<RestApiSummary[]> {
    const out: RestApiSummary[] = [];
    const limit = opts?.limit ?? 500;
    let position: string | undefined;

    for (let i = 0; i < 200; i++) {
      const res = await this.client.send(
        new GetRestApisCommand({
          limit,
          ...(position ? { position } : {}),
        }),
      );
      out.push(...(res.items ?? []));
      position = res.position;
      if (!position) break;
    }

    return out;
  }

  /**
   * List API keys (paginated).
   *
   * @param opts - Query options (nameQuery + includeValues).
   */
  async listApiKeys(opts: {
    nameQuery: string;
    includeValues: boolean;
    limit?: number;
  }): Promise<ApiKeySummary[]> {
    const { nameQuery, includeValues } = opts;
    if (!nameQuery) throw new Error('nameQuery is required');

    const out: ApiKeySummary[] = [];
    const limit = opts.limit ?? 500;
    let position: string | undefined;

    for (let i = 0; i < 200; i++) {
      const res = await this.client.send(
        new GetApiKeysCommand({
          nameQuery,
          includeValues,
          limit,
          ...(position ? { position } : {}),
        }),
      );
      out.push(...(res.items ?? []));
      position = res.position;
      if (!position) break;
    }

    return out;
  }

  /**
   * Flush stage cache for a known REST API id.
   */
  async flushStageCache(opts: {
    restApiId: string;
    stageName: string;
  }): Promise<void> {
    const { restApiId, stageName } = opts;
    if (!restApiId) throw new Error('restApiId is required');
    if (!stageName) throw new Error('stageName is required');

    this.logger.debug(`Flushing stage cache...`, { restApiId, stageName });
    await this.client.send(
      new FlushStageCacheCommand({
        restApiId,
        stageName,
      }),
    );
  }

  /**
   * Convenience: resolve REST API id by name and flush stage cache.
   *
   * @returns The resolved REST API id.
   */
  async flushStageCacheByName(opts: {
    apiName: string;
    stageName: string;
  }): Promise<FlushStageCacheByNameResult> {
    const { apiName, stageName } = opts;
    if (!apiName) throw new Error('apiName is required');
    if (!stageName) throw new Error('stageName is required');

    const apiId = await resolveRestApiIdByName(this, apiName);
    await this.flushStageCache({ restApiId: apiId, stageName });
    return { apiId };
  }

  /**
   * Convenience: retrieve API key values by names.
   *
   * By default, missing or ambiguous keys fail the whole operation. When
   * `ifExists` is set, a missing key (no exact name match) is reported via
   * `onMissing` and omitted from the result instead of failing; every other
   * error (credentials, throttling, ambiguity, missing value) still fails.
   */
  async getApiKeyValuesByNames(opts: {
    keyNames: string[];
    ifExists?: boolean;
    onMissing?: (keyName: string) => void;
  }): Promise<string[]> {
    const { keyNames, ifExists, onMissing } = opts;
    if (!keyNames.length) throw new Error('keyNames is required');
    return await getApiKeyValuesByNames(this, keyNames, {
      ifExists,
      onMissing,
    });
  }
}
