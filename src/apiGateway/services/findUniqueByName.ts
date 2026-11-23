/**
 * Requirements addressed:
 * - Provide deterministic, testable selection rules for name-based AWS resources.
 * - Require an exact name match; never fall back to "the only item returned",
 *   since callers may query AWS with a prefix match (e.g. API Gateway's
 *   `GetApiKeys` `nameQuery`), where a single returned item is not
 *   necessarily the requested name.
 * - Let callers customize the "not found" error (e.g. a typed,
 *   `ApiKeyNotFoundError` for API key lookups) while keeping a sane default
 *   for other callers (e.g. REST API name resolution).
 */

export const findUniqueByName = <T extends { name?: string }>(opts: {
  items: T[];
  name: string;
  label: string;
  /**
   * Optional factory for the "not found" error. Defaults to a plain `Error`.
   */
  notFound?: (name: string) => Error;
}): T => {
  const { items, name, label, notFound } = opts;

  const exact = items.filter((i) => i.name === name);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new Error(
      `Ambiguous ${label}: multiple results match name '${name}'.`,
    );
  }

  throw notFound
    ? notFound(name)
    : new Error(`Unable to find ${label} '${name}'.`);
};
