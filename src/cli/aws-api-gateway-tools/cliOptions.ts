/** Builds the get-dotenv host options for the standalone API Gateway CLI. */
import type { CreateCliOptions } from '@karmaniverous/get-dotenv/cli';
import {
  awsPlugin,
  batchPlugin,
  cmdPlugin,
  initPlugin,
} from '@karmaniverous/get-dotenv/plugins';

import { apiGatewayPlugin } from '../../apiGatewayPlugin/apiGatewayPlugin';

/** Create CLI options with this package's host identity. */
export const createAwsApiGatewayCliOptions = (
  importMetaUrl: string,
): CreateCliOptions => ({
  alias: 'aws-api-gateway-tools',
  importMetaUrl,
  compose: (program) =>
    program
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin())
      .use(awsPlugin().use(apiGatewayPlugin()))
      .use(initPlugin()),
});
