/**
 * Requirements addressed:
 * - `pull-keys --vars VAR=keyName ...` maps API keys to dotenv variables.
 * - Pairs follow the root `--vars` syntax, including any custom delimiter /
 *   assignor (or patterns) set at the root.
 * - Each argument is dotenv-expanded first, so `--vars $MAP` may expand to
 *   several pairs.
 * - A repeated variable collects its key names, in order.
 * - Config `pullKeys.vars` maps a variable to one key name or several; each
 *   key name is dotenv-expanded.
 */

import { parseVarsPairs, type VarsSyntax } from '@karmaniverous/get-dotenv';

/** Variable name to the API key names whose values are written to it. */
export type VarsTargets = Map<string, string[]>;

const add = (targets: VarsTargets, variable: string, keyName: string) => {
  const names = targets.get(variable);
  if (names) names.push(keyName);
  else targets.set(variable, [keyName]);
};

/**
 * Parse CLI `--vars` arguments into variable targets.
 *
 * @param args - Raw `--vars` arguments, before expansion.
 * @param expand - Dotenv expansion applied to each argument.
 * @param syntax - Root vars syntax (delimiter / assignor settings).
 * @returns Ordered variable targets; throws on a malformed pair or when no pair remains.
 */
export const resolveCliVarsTargets = (
  args: string[],
  expand: (raw: string) => string | undefined,
  syntax: VarsSyntax,
): VarsTargets => {
  const targets: VarsTargets = new Map();
  for (const raw of args) {
    for (const [variable, keyName] of parseVarsPairs(
      expand(raw) ?? '',
      syntax,
    )) {
      if (!keyName) {
        throw new Error(
          `vars pair '${variable}' needs an API key name (VAR=keyName).`,
        );
      }
      add(targets, variable, keyName);
    }
  }
  if (!targets.size) throw new Error('vars contains no VAR=keyName pairs.');
  return targets;
};

/**
 * Convert config `pullKeys.vars` into variable targets.
 *
 * @param vars - Variable name to one API key name or several.
 * @param expand - Dotenv expansion applied to each key name.
 * @returns Ordered variable targets; throws on an empty key name or when no key name remains.
 */
export const resolveConfigVarsTargets = (
  vars: Record<string, string | string[]>,
  expand: (raw: string) => string | undefined,
): VarsTargets => {
  const targets: VarsTargets = new Map();
  for (const [variable, value] of Object.entries(vars)) {
    for (const raw of Array.isArray(value) ? value : [value]) {
      const keyName = expand(raw);
      if (!keyName) {
        throw new Error(
          `pullKeys.vars.${variable} contains an empty API key name after expansion.`,
        );
      }
      add(targets, variable, keyName);
    }
  }
  if (!targets.size)
    throw new Error('pullKeys.vars contains no API key names.');
  return targets;
};
