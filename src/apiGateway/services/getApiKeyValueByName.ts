/**
 * Requirements addressed:
 * - pull-keys must fail the whole command when any key is missing (unless
 *   `--if-exists` is set, handled one layer up by the caller).
 * - Key selection: require an exact name match; otherwise throw a typed
 *   `ApiKeyNotFoundError` (never silently fall back to a prefix match).
 * - Require includeValues to retrieve key values.
 */

import { ApiKeyNotFoundError } from '../errors';
import type { ApiGatewayPort } from '../ports/apiGatewayPort';
import { findUniqueByName } from './findUniqueByName';

export const getApiKeyValueByName = async (
  port: ApiGatewayPort,
  keyName: string,
): Promise<string> => {
  const items = await port.listApiKeys({
    includeValues: true,
    nameQuery: keyName,
    limit: 500,
  });

  const key = findUniqueByName({
    items,
    name: keyName,
    label: 'API key',
    notFound: (name) => new ApiKeyNotFoundError(name),
  });
  if (!key.value) {
    throw new Error(
      `API key '${keyName}' is missing a value (includeValues?).`,
    );
  }

  return key.value;
};
