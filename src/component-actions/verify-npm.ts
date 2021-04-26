import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { ComponentActionError } from '../error';
import { retry } from '../utils/retry';
import metadataDownload from './metadata-download';
import debugFactory from 'debug';
import execa from 'execa';
import core from '@actions/core';

import type { RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.VerifyNpm}`);

export default async function (context: RunnerContext, options: InvokerOptions) {
  const {
    shouldSkipCi,
    shouldSkipCd,
    hasPrivate,
    hasBin,
    packageName,
    packageVersion,
    retryCeilingSeconds
  } = await metadataDownload(context, {
    enableFastSkips: true,
    repository: false,
    ...options
  });

  if (!shouldSkipCi && !shouldSkipCd && !hasPrivate) {
    debug(`attempting to install ${packageName}@${packageVersion}`);
    const ms2s = (ms: number) => Math.trunc(ms / 1000);

    await retry(
      () =>
        execa('npm', ['install', `${packageName}@${packageVersion}`], {
          env: { NODE_ENV: 'production' },
          stdio: 'inherit'
        }),
      {
        maxAttempts: 0,
        maxJitterMs: 5000,
        maxTotalElapsedMs: retryCeilingSeconds * 1000,
        minDelayMs: 10000,
        maxDelayMs: 30000,
        onFailure(lastError, attempt, nextDelay, time) {
          core.info(
            `transient failure at ${ms2s(time)}s: attempt #${attempt} installing ` +
              `${packageName}@${packageVersion} did not succeed: ${lastError}\n---\n` +
              `next attempt in ${ms2s(nextDelay)} seconds...`
          );
          return true;
        },
        onLimitReached(lastError, tries, _, time) {
          throw new ComponentActionError(
            `fatal error at ${ms2s(
              time
            )}s: unable to install ${packageName}@${packageVersion} after ${tries} tries: ${lastError}`
          );
        }
      }
    );

    try {
      await execa('node', ['-e', `const test = require('${pkgName}');`]);
    } catch (e) {
      throw new ComponentActionError(`generic execution test failed: ${e}`);
    }

    if (hasBin) {
      try {
        await execa('npx', ['--no-install', pkgName, '--help']);
      } catch (e) {
        throw new ComponentActionError(`npx cli test failed: ${e}`);
      }
    }
  } else debug(`skipped component action "${ComponentAction.VerifyNpm}"`);
}
