import { describe, expect, it } from 'vitest';

import {
  resolveCliVarsTargets,
  resolveConfigVarsTargets,
} from './resolveVarsTargets';

const identity = (raw: string) => raw;
const entries = (m: Map<string, string[]>) => [...m.entries()];

describe('resolveCliVarsTargets', () => {
  it('maps each VAR=keyName pair to its variable, in order', () => {
    expect(
      entries(resolveCliVarsTargets(['A=key-a', 'B=key-b'], identity, {})),
    ).toEqual([
      ['A', ['key-a']],
      ['B', ['key-b']],
    ]);
  });

  it('collects the key names of a repeated variable, in order', () => {
    expect(
      entries(resolveCliVarsTargets(['X=k1', 'Y=k2', 'X=k3'], identity, {})),
    ).toEqual([
      ['X', ['k1', 'k3']],
      ['Y', ['k2']],
    ]);
  });

  it('expands each argument before parsing, so one argument may hold several pairs', () => {
    const expand = (raw: string) => (raw === '$MAP' ? 'A=k1 B=k2' : raw);
    expect(entries(resolveCliVarsTargets(['$MAP'], expand, {}))).toEqual([
      ['A', ['k1']],
      ['B', ['k2']],
    ]);
  });

  it('honors the root vars delimiter and assignor', () => {
    expect(
      entries(
        resolveCliVarsTargets(['A:k1,B:k2'], identity, {
          varsDelimiter: ',',
          varsAssignor: ':',
        }),
      ),
    ).toEqual([
      ['A', ['k1']],
      ['B', ['k2']],
    ]);
  });

  it('rejects a pair without a key name', () => {
    expect(() => resolveCliVarsTargets(['A'], identity, {})).toThrow(
      /vars pair 'A' needs an API key name/,
    );
    expect(() => resolveCliVarsTargets(['A='], identity, {})).toThrow(
      /vars pair 'A' needs an API key name/,
    );
  });

  it('rejects input that yields no pairs, including an empty expansion', () => {
    expect(() => resolveCliVarsTargets([''], identity, {})).toThrow(
      /no VAR=keyName pairs/,
    );
    expect(() =>
      resolveCliVarsTargets(['$UNSET'], () => undefined, {}),
    ).toThrow(/no VAR=keyName pairs/);
  });
});

describe('resolveConfigVarsTargets', () => {
  it('accepts one key name or several per variable, expanding each', () => {
    const expand = (raw: string) => raw.replace('${ENV}', 'dev');
    expect(
      entries(
        resolveConfigVarsTargets(
          { A: 'api-a-${ENV}', B: ['b1', 'b2'] },
          expand,
        ),
      ),
    ).toEqual([
      ['A', ['api-a-dev']],
      ['B', ['b1', 'b2']],
    ]);
  });

  it('rejects an empty key name after expansion', () => {
    expect(() => resolveConfigVarsTargets({ A: '$UNSET' }, () => '')).toThrow(
      /pullKeys\.vars\.A contains an empty API key name/,
    );
  });

  it('rejects a mapping with no key names', () => {
    expect(() => resolveConfigVarsTargets({ A: [] }, identity)).toThrow(
      /pullKeys\.vars contains no API key names/,
    );
  });
});
