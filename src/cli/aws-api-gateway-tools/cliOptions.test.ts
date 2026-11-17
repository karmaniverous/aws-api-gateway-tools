import { describe, expect, it, vi } from 'vitest';

import { createAwsApiGatewayCliOptions } from './cliOptions';

describe('createAwsApiGatewayCliOptions', () => {
  it('passes the host importMetaUrl to get-dotenv', () => {
    const importMetaUrl = 'file:///package/dist/cli/run.js';
    const options = createAwsApiGatewayCliOptions(importMetaUrl);

    expect(options.alias).toBe('aws-api-gateway-tools');
    expect(options.importMetaUrl).toBe(importMetaUrl);
    expect(options.compose).toBeTypeOf('function');

    const program = { use: vi.fn() };
    program.use.mockReturnValue(program);

    expect(options.compose?.(program as never)).toBe(program);
    expect(program.use).toHaveBeenCalledTimes(4);
  });
});
