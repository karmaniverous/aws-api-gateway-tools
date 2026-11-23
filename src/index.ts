/**
 * This is the main entry point for the library.
 *
 * @packageDocumentation
 */

/**
 * Requirements addressed:
 * - Export a public `AwsApiGatewayTools` without loading get-dotenv.
 * - Export the local public `Logger` contract.
 */

export type { FlushStageCacheByNameResult } from './apiGateway/AwsApiGatewayTools';
export {
  AwsApiGatewayTools,
  type AwsApiGatewayToolsOptions,
} from './apiGateway/AwsApiGatewayTools';
export { ApiKeyNotFoundError } from './apiGateway/errors';
export type {
  ApiGatewayPort,
  ApiKeySummary,
  RestApiSummary,
} from './apiGateway/ports/apiGatewayPort';
export { assertLogger, type Logger } from './logger';
