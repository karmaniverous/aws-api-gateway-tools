/**
 * Standalone bin entry. The get-dotenv-backed runner is dynamically imported
 * so the optional peer can fail with an actionable installation hint.
 *
 * @packageDocumentation
 */

import { launch } from './launcher';

await launch(() => import('./run'), {
  bin: 'aws-api-gateway-tools',
  pkg: '@karmaniverous/aws-api-gateway-tools',
});
