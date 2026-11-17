import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
  exports?: Record<string, unknown>;
  releaseIt?: unknown;
  'release-it'?: { github?: { releaseName?: string } };
};

describe('package contract', () => {
  it('declares get-dotenv as an optional peer and dev dependency only', () => {
    expect(pkg.dependencies).not.toHaveProperty('@karmaniverous/get-dotenv');
    expect(pkg.devDependencies).toHaveProperty(
      '@karmaniverous/get-dotenv',
      '^8.0.0-0',
    );
    expect(pkg.peerDependencies).toHaveProperty(
      '@karmaniverous/get-dotenv',
      '^8.0.0-0',
    );
    expect(pkg.peerDependenciesMeta).toMatchObject({
      '@karmaniverous/get-dotenv': { optional: true },
    });
  });

  it('exports the isolated get-dotenv entry and declares zod', () => {
    expect(pkg.dependencies).toHaveProperty('zod');
    expect(pkg.exports).toHaveProperty('./get-dotenv');
  });

  it('names GitHub releases after the package', () => {
    expect(pkg['release-it']?.github?.releaseName).toBe(
      "${name.split('/').pop()}@${version}",
    );
  });
});
