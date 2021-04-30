import { name as pkgName } from '../../package.json';
import debugFactory from 'debug';

import type { AttemptOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:retry`);

export const DEFAULT_MAX_RETRIES = 10;
export const DEFAULT_MIN_DELAY = 100;
export { retry as attempt };

// TODO: XXX: turn this into exponential-retry package
// TODO: XXX: also offer a `.sync` version and `attempt` as an alias of `retry`
// TODO: XXX: and give examples of unit testing code that uses retry
/**
 * Super simple automatic function retrying using exponential backoff.
 * Promise-based, fully-typed, completely isomorphic, and with a data-rich
 * interface for simple and complex use cases. When a testing environment is
 * detected (NODE_ENV == 'test'), all timers are replaced by resolved promises.
 * That is: there's no need to muck around with fake/mocked timers in your unit
 * tests.
 */

/**
 * This function attempts to execute `fn`. If `fn` rejects or throws, it will be
 * executed again after a short delay according to exponential backoff. By
 * default, `fn` will be attempted 10 times before giving up. Otherwise, if
 * execution is successful, the result of `fn` is available when this function
 * resolves.
 */
export async function retry<T = ReturnType<Parameters<typeof retry>[0]>>(
  fn: () => T,
  options: Partial<AttemptOptions> = {}
) {
  type OnLimitReachedFn = Exclude<AttemptOptions['onLimitReached'], boolean>;

  // ? With zero config, we don't want this thing retrying forever
  const maxAttempts =
    options.maxAttempts === undefined
      ? DEFAULT_MAX_RETRIES
      : options.maxAttempts === 0
      ? Infinity
      : options.maxAttempts;

  const maxTotalElapsedMs = options.maxTotalElapsedMs || Infinity;
  const minDelayMs = options.minDelayMs || DEFAULT_MIN_DELAY;
  const maxDelayMs = options.maxDelayMs || Infinity;
  const maxJitterMs = options.maxJitterMs || 0;
  const firstAttemptMs = Date.now();

  const onFailure = options.onFailure || (() => true);

  const onLimitReached: OnLimitReachedFn =
    typeof options.onLimitReached == 'function'
      ? options.onLimitReached
      : options.onLimitReached || options.onLimitReached === undefined
      ? (_, __, cause) => {
          throw new Error(
            `maximum ${
              cause == 'delay' ? `elapsed runtime` : cause
            } exceeded while retrying function`
          );
        }
      : () => {
          /* noop */
        };

  debug('resolved options: %O', {
    maxAttempts,
    maxTotalElapsedMs,
    minDelayMs,
    maxDelayMs,
    maxJitterMs,
    firstAttemptMs,
    onFailure,
    onLimitReached
  });

  const useFakeTimer = process.env.NODE_ENV == 'test';
  useFakeTimer && debug('test environment detected. Using fake timers');

  for (let attempts = 0; ++attempts; ) {
    debug(`attempt ${attempts}/${maxAttempts}`);
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await fn();
      debug('function succeeded, attempt completed successfully');
      return result;
    } catch (e) {
      const totalElapsedMs = Date.now() - firstAttemptMs;
      debug(`function failed (totalElapsedMs: ${totalElapsedMs})`);

      if (totalElapsedMs > maxTotalElapsedMs) {
        debug(`exceeded maxTotalElapsedMs (${totalElapsedMs} > ${maxTotalElapsedMs})`);
        // eslint-disable-next-line no-await-in-loop
        await onLimitReached(e, attempts, 'delay', totalElapsedMs);
        break;
      } else if (attempts >= maxAttempts) {
        debug(`reached maxAttempts (${attempts} >= ${maxAttempts})`);
        // eslint-disable-next-line no-await-in-loop
        await onLimitReached(e, attempts, 'attempts', totalElapsedMs);
        break;
      } else {
        const jitterMs = Math.random() * maxJitterMs;
        const nextDelayMs =
          Math.min(maxDelayMs, 2 ** (attempts - 1) * minDelayMs) + jitterMs;

        debug(`might attempt again in ${nextDelayMs}ms (jitter: ${jitterMs})`);

        // eslint-disable-next-line no-await-in-loop
        if (!(await onFailure(e, attempts, nextDelayMs, totalElapsedMs)))
          throw new Error('attempted execution was aborted');

        debug('sleeping before next attempt...');
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) =>
          /* istanbul ignore next */
          useFakeTimer ? resolve() : setTimeout(resolve, nextDelayMs)
        );
      }
    }
  }
}
