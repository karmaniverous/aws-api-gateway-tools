import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('smoke configuration', () => {
  it('keeps the AWS profile machine-local', () => {
    expect(read('smoke/.env')).not.toContain('SMOKE_AWS_PROFILE');
    expect(read('smoke/.env.local.template')).toMatch(/^SMOKE_AWS_PROFILE=$/m);
    expect(read('smoke/README.md')).not.toContain('JGS-SSO');
  });
});
