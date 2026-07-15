import { builtinModules, createRequire } from 'node:module';

import aliasPlugin, { type Alias } from '@rollup/plugin-alias';
import commonjsPlugin from '@rollup/plugin-commonjs';
import jsonPlugin from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescriptPlugin from '@rollup/plugin-typescript';
import fs from 'fs-extra';
import type { InputOptions, RollupOptions } from 'rollup';
import dtsPlugin from 'rollup-plugin-dts';

const require = createRequire(import.meta.url);
type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};
const pkg = require('./package.json') as PackageJson;

/**
 * Externalization rules:
 * - Treat Node built-ins and all runtime deps/peerDeps as external.
 * - Also treat dependency *subpath* imports as external (e.g. `pkg/x`), not just
 *   the package root `pkg`. This avoids Rollup bundling dependency internals
 *   when consumers import subpath exports.
 */
const runtimeDeps = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  'tslib',
];
const runtimeDepSet = new Set(runtimeDeps);
const runtimeDepPrefixes = runtimeDeps.map((d) => `${d}/`);
const builtinSet = new Set(builtinModules);

const isNodeBuiltin = (id: string): boolean => {
  const bare = id.startsWith('node:') ? id.slice(5) : id;
  return builtinSet.has(bare) || builtinSet.has(id);
};

const isExternal = (id: string): boolean => {
  if (!id) return false;
  if (id.startsWith('\0')) return false;
  if (id.startsWith('.') || id.startsWith('/')) return false;
  if (isNodeBuiltin(id)) return true;
  if (runtimeDepSet.has(id)) return true;
  return runtimeDepPrefixes.some((p) => id.startsWith(p));
};

const outputPath = `dist`;

// Rollup writes bundle outputs; the TS plugin should only transpile.
// - outputToFilesystem=false avoids outDir/dir validation errors for multi-output builds.
// - incremental=false avoids TS build-info state referencing transient Rollup config artifacts.
const typescript = typescriptPlugin({
  tsconfig: './tsconfig.json',
  outputToFilesystem: false,
  // Only compile bundled sources; prevents transient Rollup config artifacts
  // (e.g. rollup.config-*.mjs) from being pulled into the TS program.
  include: ['src/**/*.ts'],
  exclude: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],

  // Override repo tsconfig settings for bundling.
  noEmit: false,
  declaration: false,
  declarationMap: false,
  incremental: false,
  allowJs: false,
  checkJs: false,
});

const commonPlugins = [
  commonjsPlugin(),
  jsonPlugin(),
  nodeResolve(),
  typescript,
];

const commonAliases: Alias[] = [];

/**
 * Common input options for library builds (ESM only).
 * Externalize runtime dependencies and peers.
 */
const commonInputOptions: InputOptions = {
  input: 'src/index.ts',
  external: (id) => isExternal(id),
  plugins: [aliasPlugin({ entries: commonAliases }), ...commonPlugins],
};

/**
 * Discover CLI commands under src/cli.
 *
 * Keep this synchronous so the Rollup CLI can load this TS config
 * deterministically (we run Rollup under `tsx` in npm scripts).
 */
let cliCommands: string[] = [];
try {
  cliCommands = fs.readdirSync('src/cli');
} catch {
  // cliCommands remains [] if src/cli is not found
}

/**
 * Build the library (ESM only).
 */
export const buildLibrary = (dest: string): RollupOptions => ({
  ...commonInputOptions,
  output: [
    {
      dir: `${dest}/mjs`,
      extend: true,
      format: 'esm',
    },
  ],
});

/**
 * Build bundled .d.ts at dest/index.d.ts.
 */
export const buildTypes = (dest: string): RollupOptions => ({
  input: 'src/index.ts',
  output: [{ file: `${dest}/index.d.ts`, format: 'esm' }],
  external: (id) => isExternal(id),
  plugins: [dtsPlugin()],
});

/** Assemble complete config including CLI outputs. */
const config: RollupOptions[] = [
  // Library output (ESM only)
  buildLibrary(outputPath),

  // Type definitions output (single .d.ts)
  buildTypes(outputPath),

  // CLI output.
  ...cliCommands.map<RollupOptions>((c) => ({
    ...commonInputOptions,
    input: `src/cli/${c}/index.ts`,
    output: [
      {
        dir: `${outputPath}/cli/${c}`,
        extend: true,
        format: 'esm',
        banner: '#!/usr/bin/env node',
      },
    ],
  })),
];

export default config;
