/**
 * Public logger contract and runtime validation used by the core package
 * without loading the optional get-dotenv peer.
 *
 * @packageDocumentation
 */

/** Logger surface shared with AWS SDK v3 and get-dotenv. */
export type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

/** Validate and return a complete {@link Logger}. */
export const assertLogger = (candidate: unknown): Logger => {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('logger must be an object');
  }

  const logger = candidate as Partial<Logger>;
  if (
    typeof logger.debug !== 'function' ||
    typeof logger.info !== 'function' ||
    typeof logger.warn !== 'function' ||
    typeof logger.error !== 'function'
  ) {
    throw new Error(
      'logger must implement debug, info, warn, and error methods',
    );
  }

  return logger as Logger;
};
