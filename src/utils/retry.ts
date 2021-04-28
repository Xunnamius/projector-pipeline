import { name as pkgName } from '../../package.json';
import { toss } from 'toss-expression';
import debugFactory from 'debug';

import type { Promisable } from 'type-fest';
import type { AttemptOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:retry`);

export const DEFAULT_MAX_RETRIES = 10;
export const DEFAULT_MIN_DELAY = 100;
export { retry as attempt };

// TODO: XXX: turn this into exponential-retry package
// TODO: XXX: also offer a `.sync` version and `attempt` as an alias of `retry`
/**
 * Dead-simple automatic function retrying using exponential backoff.
 * Promise-based, fully-typed, completely isomorphic, and with an easy interface
 * so you can get back to what you were doing.
 */

/**
 * This function attempts to execute `fn`. If `fn` rejects or throws, it will be
 * executed again after a short delay according to exponential backoff. By
 * default, `fn` will be attempted 10 times before giving up. Otherwise, if
 * execution is successful, the result of `fn` is available when this function
 * resolves.
 */
export async function retry(
  fn: () => Promisable<unknown>,
  options: Partial<AttemptOptions> = {}
) {
  type OnLimitReachedFn = Exclude<AttemptOptions['onLimitReached'], boolean>;

  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_RETRIES;
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
        (await onFailure(e, attempts, nextDelayMs, totalElapsedMs)) ||
          toss(new Error('attempted execution was aborted'));

        debug('sleeping before next attempt...');
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, nextDelayMs));
      }
    }
  }
}
