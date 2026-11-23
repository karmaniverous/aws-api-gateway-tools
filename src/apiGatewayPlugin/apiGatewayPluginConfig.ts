/**
 * Requirements addressed:
 * - Support safe plugin defaults from get-dotenv config under `plugins['aws/api-gateway']`.
 * - CLI flags override config defaults.
 */

import { z } from 'zod';

/**
 * Zod schema for the `plugins['aws/api-gateway']` configuration slice.
 *
 * CLI flags override config defaults.
 */
export const apiGatewayPluginConfigSchema = z.object({
  /** Default REST API id (supports $VAR expansion at action time). */
  apiId: z.string().optional(),
  /** Default REST API name (supports $VAR expansion at action time). */
  apiName: z.string().optional(),
  /** Default stage name (supports $VAR expansion at action time). */
  stageName: z.string().optional(),
  /** Default template extension used by pull-keys when target file is missing. */
  templateExtension: z.string().optional(),
  /**
   * Defaults for `aws api-gateway flush-cache`.
   */
  flushCache: z
    .object({
      /**
       * Default REST API id (supports $VAR expansion at action time).
       */
      apiId: z.string().optional(),
      /**
       * Default REST API name (supports $VAR expansion at action time).
       */
      apiName: z.string().optional(),
      /**
       * Default stage name (supports $VAR expansion at action time).
       */
      stageName: z.string().optional(),
    })
    .optional(),
  /**
   * Defaults for `aws api-gateway pull-keys`.
   */
  pullKeys: z
    .object({
      /**
       * Default list of API key names (space-delimited on CLI; config is an array).
       */
      keyNames: z.array(z.string()).optional(),
      /**
       * Default target dotenv variable name to write.
       */
      variableName: z.string().optional(),
      /**
       * Default delimiter used to join key values (default is ", " when omitted).
       */
      delimiter: z.string().optional(),
      /**
       * Default destination selector `(global|env):(public|private)`, e.g. `env:private`.
       */
      to: z.string().optional(),
      /**
       * When `true`, skip (with a warning) API keys that don't exist by
       * exact name instead of failing the whole command. Default: `false`.
       */
      ifExists: z.boolean().optional(),
      /**
       * Default `VAR=keyName` mapping for `--vars`: dotenv variable name to
       * the API key NAME(s) (not values) whose values are written to it
       * (joined by `delimiter` when more than one). Conflicts with
       * `keyNames`/`variableName`.
       */
      vars: z
        .record(z.string(), z.union([z.string(), z.array(z.string())]))
        .optional(),
    })
    .optional(),
});

/**
 * Validated config shape for the `aws api-gateway` plugin instance.
 */
export type ApiGatewayPluginConfig = z.output<
  typeof apiGatewayPluginConfigSchema
>;
