/** Verify built entry-point dependency boundaries. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEntry = readFileSync(resolve('dist/mjs/index.js'), 'utf8');
const pluginEntry = readFileSync(
  resolve('dist/mjs/get-dotenv/index.js'),
  'utf8',
);

if (rootEntry.includes('@karmaniverous/get-dotenv')) {
  throw new Error('main entry references the optional get-dotenv peer');
}
if (!pluginEntry.includes("from '@karmaniverous/get-dotenv")) {
  throw new Error('get-dotenv entry does not retain its peer import');
}
if (!pluginEntry.includes("from 'zod'")) {
  throw new Error('get-dotenv entry does not retain zod as an external import');
}
if (/class \$?ZodError\b/.test(pluginEntry)) {
  throw new Error('zod implementation was bundled');
}

console.log('verify:bundle: optional-peer and zod boundaries are intact');
