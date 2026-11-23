/**
 * Requirements addressed:
 * - pull-keys accepts a space-delimited list of key names and retrieves all values.
 * - Missing or ambiguous keys fail the whole operation by default.
 * - Preserve user-provided ordering.
 * - `ifExists`: when set, a missing key (exact-name `ApiKeyNotFoundError`) is
 *   reported via `onMissing` and omitted from the result instead of failing
 *   the whole operation. Every other error (credentials, throttling,
 *   ambiguity, missing value) still fails the operation.
 */

import { ApiKeyNotFoundError } from '../errors';
import type { ApiGatewayPort } from '../ports/apiGatewayPort';
import { getApiKeyValueByName } from './getApiKeyValueByName';

export type GetApiKeyValuesByNamesOptions = {
  /** When `true`, skip (and report via `onMissing`) keys that don't exist. */
  ifExists?: boolean;
  /** Called for each key name skipped because it was not found. */
  onMissing?: (keyName: string) => void;
};

export const getApiKeyValuesByNames = async (
  port: ApiGatewayPort,
  keyNames: string[],
  opts: GetApiKeyValuesByNamesOptions = {},
): Promise<string[]> => {
  const { ifExists = false, onMissing } = opts;

  const values: string[] = [];
  for (const name of keyNames) {
    try {
      values.push(await getApiKeyValueByName(port, name));
    } catch (err) {
      if (ifExists && err instanceof ApiKeyNotFoundError) {
        onMissing?.(name);
        continue;
      }
      throw err;
    }
  }
  return values;
};
