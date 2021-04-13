import { name as pkgName } from '../../package.json';
import debugFactory from 'debug';
import cache from '@actions/cache';

const debug = debugFactory(`${pkgName}:actions-cache`);

/**
 * Cache `paths` at key `cacheKey`.
 */
export async function cachePaths(paths: string[], cacheKey: string) {
  debug(`caching with key "${cacheKey}" paths: %O`, paths);
  await cache.saveCache(paths, cacheKey);
}

/**
 * Unpack cached data to `paths` at key `cacheKey`. If `cacheKey` cannot be
 * found, `restoreKeys` is used instead. Returns `true` if the any of the keys
 * were found and the cache was restored successfully or `false` otherwise.
 */
export async function uncachePaths(
  paths: string[],
  cacheKey: string,
  restoreKeys?: string[]
) {
  debug(`restoring with key "${cacheKey}" cached paths: %O`, paths);
  return !!(await cache.restoreCache(paths, cacheKey, restoreKeys));
}
