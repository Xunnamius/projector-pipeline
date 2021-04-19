import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import { GIT_MIN_VERSION } from '../index';
import { resolve } from 'path';
import debugFactory from 'debug';
import execa from 'execa';
import semver from 'semver';
import core from '@actions/core';
import artifact from '@actions/artifact';
import cache from '@actions/cache';

import type { CloneOptions, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:github`);

/**
 * Upload `paths` to artifact storage using key `artifactKey`.
 */
export async function uploadPaths(
  paths: string[],
  artifactKey: string,
  retentionDays: number
) {
  debug(
    `uploading artifact with key "${artifactKey}" (${retentionDays}) and paths: %O`,
    paths
  );

  const uploadInfo = await artifact
    .create()
    .uploadArtifact(artifactKey, paths, '.', { continueOnError: false, retentionDays });

  if (!uploadInfo.artifactItems.length) {
    throw new ComponentActionError(
      `failed to upload artifact "${artifactKey}": paths matched 0 items`
    );
  }

  if (uploadInfo.failedItems.length) {
    throw new ComponentActionError(
      `failed to upload artifact "${artifactKey}": ${uploadInfo.failedItems.length} items failed to upload`
    );
  }
}

/**
 * Download and unpack artifact `artifactKey` to directory `destDir`. By
 * default, `destDir` is the current working directory.
 */
export async function downloadPaths(artifactKey: string, destDir?: string) {
  debug(`downloading artifact with key "${artifactKey}" to path: ${destDir}`);
  await artifact
    .create()
    .downloadArtifact(artifactKey, destDir, { createArtifactFolder: false });
}

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

/**
 * Checks out a repository from GitHub, similar to `@actions/checkout` but
 * dramatically simplified.
 */
export async function cloneRepository(
  options: CloneOptions,
  githubToken: InvokerOptions['githubToken']
) {
  let { stdout: gitVersion } = await execa('git', ['--version']);
  gitVersion = gitVersion.trim().split(' ').slice(-1)[0];

  if (semver.satisfies(gitVersion, `<${GIT_MIN_VERSION}`)) {
    throw new ComponentActionError(
      `system git version ${gitVersion} is below the minimum required (${GIT_MIN_VERSION})`
    );
  }

  const repositoryPath = resolve(options.repositoryPath);
  const repositoryName = `${options.repositoryOwner}/${options.repositoryName}`;
  const repositoryUri = `https://${
    githubToken ? `${githubToken}@` : ''
  }github.com/${repositoryName}.git`;

  const depth = options.fetchDepth > 0 ? ['--depth', options.fetchDepth.toString()] : [];
  const checkout = !options.checkoutRef ? ['--no-checkout'] : [];

  core.info(
    `cloning GitHub repository: ${repositoryName}
    from: ${repositoryUri}
    to directory: ${repositoryPath}
    depth: ${depth.join(' ')}
    branch: ${options.branchOrTag}
    ref to be checked out: ${
      options.checkoutRef || '(working tree will not be checked out)'
    }`
  );

  // ? Clone the repository
  await execa(
    'git',
    [
      'clone',
      '--branch',
      options.branchOrTag,
      ...depth,
      ...checkout,
      '--',
      repositoryUri,
      repositoryPath
    ],
    {
      stdio: 'inherit'
    }
  );

  // ? Disable garbage collection, save cycles
  await execa('git', ['config', '--local', 'gc.auto', '0'], {
    stdio: 'inherit'
  }).catch(() => debug('(failed to disable garbage collection for this run)'));

  // ? Checkout options.checkoutRef
  if (options.checkoutRef && options.branchOrTag != options.checkoutRef) {
    debug(`checking out ref: ${options.checkoutRef}`);
    await execa('git', ['checkout', options.checkoutRef]);
  } else debug('(skipped explicit checkout)');
}
