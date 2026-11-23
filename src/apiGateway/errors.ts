/**
 * Requirements addressed:
 * - Provide a typed, exported error for "API key not found by exact name" so
 *   that callers (e.g. `pull-keys --if-exists`) can distinguish "missing key"
 *   from every other failure (credentials, throttling, ambiguity, missing
 *   value) and handle it differently.
 */

/**
 * Thrown when no API key has the exact requested name.
 *
 * Distinct from ambiguity (multiple exact matches) and from "key found but
 * has no value" — both of those remain plain `Error`s.
 */
export class ApiKeyNotFoundError extends Error {
  /** The API key name that could not be found (exact match). */
  public readonly keyName: string;

  constructor(keyName: string) {
    super(`API key '${keyName}' not found.`);
    this.name = 'ApiKeyNotFoundError';
    this.keyName = keyName;
    Object.setPrototypeOf(this, ApiKeyNotFoundError.prototype);
  }
}
