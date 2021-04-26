import { name as pkgName } from '../../package.json';
import { toss } from 'toss-expression';
import debugFactory from 'debug';

import type { Promisable } from 'type-fest';
import type { AttemptOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:retry`);
const DEFAULT_MAX_RETRIES = 10;

// TODO: XXX: turn this into exponential-retry package.
/**
 * Dead-simple automatic function retrying using exponential backoff.
 * Promise-based, fully-typed, completely isomorphic, and with an easy interface
 * so you can get back to what you were doing.
 */
export async function retry(
  fn: () => Promisable<unknown>,
  options: Partial<AttemptOptions>
) {
  type OnLimitReachedFn = Exclude<AttemptOptions['onLimitReached'], boolean>;

  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_RETRIES;
  const maxTotalElapsedMs = options.maxTotalElapsedMs || Infinity;
  const minDelayMs = options.minDelayMs || 0;
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

  for (let attempts = 0; attempts++; ) {
    debug(`attempt ${attempts}/${maxAttempts}`);
    try {
      // eslint-disable-next-line no-await-in-loop
      await fn();
      debug('function succeeded, attempt completed successfully');
      return;
    } catch (e) {
      const totalElapsedMs = Date.now() - firstAttemptMs;
      debug(`function failed (totalElapsedMs: ${totalElapsedMs})`);

      if (totalElapsedMs > maxTotalElapsedMs) {
        debug(`exceeded maxTotalElapsedMs (${totalElapsedMs} > ${maxTotalElapsedMs})`);
        // eslint-disable-next-line no-await-in-loop
        await onLimitReached(e, attempts, 'delay', totalElapsedMs);
        return;
      } else if (attempts >= maxAttempts) {
        debug(`reached maxAttempts (${attempts} >= ${maxAttempts})`);
        // eslint-disable-next-line no-await-in-loop
        await onLimitReached(e, attempts, 'attempts', totalElapsedMs);
        return;
      } else {
        const jitterMs = Math.random() * maxJitterMs;
        const nextDelayMs =
          Math.min(maxDelayMs, Math.max(minDelayMs, 2 ** attempts)) + jitterMs;

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
