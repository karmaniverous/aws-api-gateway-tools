/** get-dotenv-backed CLI runner loaded dynamically by the bin launcher. */
import { createCli } from '@karmaniverous/get-dotenv/cli';

import { createAwsApiGatewayCliOptions } from './cliOptions';

/** Run the standalone AWS API Gateway CLI. */
export const run = async (): Promise<void> => {
  await createCli(createAwsApiGatewayCliOptions(import.meta.url))();
};
