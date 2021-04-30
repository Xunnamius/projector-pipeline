import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import { ComponentAction } from '../../types/global';
import { installPrivilegedDependencies } from '../utils/install';
import { downloadPaths } from '../utils/github';
import { retry } from '../utils/retry';
import { existsSync, writeFileSync } from 'fs';
import { context, getOctokit } from '@actions/github';
import { RequestError } from '@octokit/request-error';
import metadataDownload from './metadata-download';
import debugFactory from 'debug';
import execa from 'execa';
import core from '@actions/core';
import * as openpgp from 'openpgp';

import type { RunnerContext, InvokerOptions, Metadata } from '../../types/global';

// ! Rules For Privileged Component Actions ! \\
// !
// ! 1. Do not share caches with unprivileged CAs
// !
// ! 2. Do not build or install* anything or run any built executables in this
// ! environment. Also for this reason, installing the client repo's dependencies
// ! cannot happen either. Installed deps are hardcoded below, rather than taken
// ! from the client repo's `package.json` file. See also: https://bit.ly/3u2K6Yr
// !
// ! 3. Do not globally expose secrets. To each shell command only the secrets
// ! necessary and nothing more. Codecov, for instance, should only get the
// ! CODECOV_TOKEN and nothing more. See also: https://bit.ly/3e1oxlw
// ! \\

const debug = debugFactory(`${pkgName}:${ComponentAction.SmartDeploy}`);
// ? Causes the CA to complete with success status w/o retry when seen
const SkipError = class extends Error {};
// ? Lets the retry code know to reattempt whatever caused this error
const RetryError = class extends Error {};

let configureGpg = async (
  privKeyArmored: string,
  passphrase: string,
  committer: Metadata['committer']
) => {
  // * Collect private key metadata
  debug('configuring gpg');

  const privKey = await openpgp.decryptKey({
    privateKey: await openpgp.readKey({ armoredKey: privKeyArmored }),
    passphrase
  });

  const pkFingerprint = privKey.getFingerprint().toUpperCase();
  const pkId = privKey.getKeyID().toHex().toUpperCase();
  const { email: pkEmail } = (await privKey.getPrimaryUser()).user.userID || {};

  if (!pkEmail || pkEmail != committer.email) {
    throw new ComponentActionError(
      `PK email (${pkEmail}) is missing and/or does not match committer email (${committer.email})`
    );
  }

  // * Configure gpg
  writeFileSync(
    '~/.gnupg/gpg-agent.conf',
    // * Borrowed from https://bit.ly/3u4wgET
    `default-cache-ttl 7200
    max-cache-ttl 31536000
    allow-preset-passphrase`
  );

  // * Restart gpg so config changes take effect
  await execa('gpg-connect-agent', ['reloadagent', '/bye'], {
    stdio: 'inherit'
  });

  // * Import private key
  await execa('gpg', ['--batch', '--import', '--yes', `<(echo '${privKeyArmored}')`], {
    stdio: 'inherit',
    shell: 'bash'
  });

  // * Acquire keygrips
  const keygrips = [];
  const { stdout: rawKeyGrips } = await execa('gpg', [
    '--batch',
    '--with-colons',
    '--list-secret-keys',
    pkFingerprint
  ]);

  for (const [, keyGrip] of rawKeyGrips.matchAll(/^grp(?:[^:\r\n]*:)+([a-f0-9]+):$/gim)) {
    keygrips.push(keyGrip);
  }

  // * Preload privKey password into gpg
  await Promise.all(
    keygrips.map(async (keyGrip) => {
      // ? See: https://www.gnupg.org/documentation/manuals/gnupg/Agent-PRESET_005fPASSPHRASE.html#Agent-PRESET_005fPASSPHRASE
      const hexPassphrase = Buffer.from(passphrase, 'utf8').toString('hex').toUpperCase();

      await execa(
        'gpg-connect-agent',
        ['preset_passphrase', keyGrip, '-1', hexPassphrase],
        { stdio: 'inherit' }
      );

      const { all: output } = await execa('gpg-connect-agent', ['keyinfo', keyGrip], {
        all: true
      });

      debug(`keyinfo for ${keyGrip} after attempted preset: ${output}`);
    })
  );

  // * Configure git to sign with privKey
  await execa('git', ['config', '--global', 'user.signingkey', pkId], {
    stdio: 'inherit'
  });

  // * Make further calls to configureGpg() noops
  configureGpg = async () => debug('(call to configureGpg was a noop)');
};

const automerge = async (githubToken: string, prNumber: number) => {
  debug('attempting auto-merge');

  const octokit = await getOctokit(githubToken, {
    userAgent: '@xunnamius/projector-pipeline'
  });

  let stage: 'observe' | 'merge' = 'observe';

  octokit.hook.error('request', async (error) => {
    debug('octokit error hook triggered: %O', error);

    if (error instanceof RequestError) {
      debug(`error handling stage: ${stage}`);

      if (stage == 'observe') {
        if (error.status == 404) {
          throw new SkipError(`PR #${prNumber} no longer exists`);
        } else if (error.status >= 500 || [408, 429].includes(error.status)) {
          throw new RetryError(error.status.toString());
        }
      } else {
        if (error.status == 404) {
          throw new SkipError(`PR #${prNumber} (this very PR) was not found?!`);
        } else if (error.status == 409) {
          throw new SkipError(`current HEAD is out of sync with PR #${prNumber}`);
        } else if (error.status >= 500 || [408, 429].includes(error.status)) {
          throw new RetryError(error.status.toString());
        }
      }
    } else debug('(error was not an instance of RequestError)');

    throw error;
  });

  const pullRequest = await octokit.pulls.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber
  });

  debug(`pr::status: ${pullRequest.status}`);
  debug(`pr::state: ${pullRequest.data.state}`);
  debug(`pr::merged: ${pullRequest.data.merged}`);
  debug(`pr::draft: ${pullRequest.data.draft}`);
  // ? The mergeability check is the actual merge request/attempt itself
  debug(
    `pr::mergeable: ${
      pullRequest.data.mergeable === true
        ? 'currently'
        : pullRequest.data.mergeable === false
        ? 'not at the moment'
        : 'maybe'
    }`
  );

  if (pullRequest.data.merged) {
    throw new SkipError('PR #${prNumber} has already been merged');
  } else if (pullRequest.data.draft) {
    throw new SkipError('PR #${prNumber} was marked as a draft');
  } else if (pullRequest.data.state != 'open') {
    throw new SkipError('PR #${prNumber} is no longer open');
  }

  stage = 'merge';

  const mergeAttempt = await octokit.pulls.merge({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: prNumber,
    sha: pullRequest.data.head.sha,
    merge_method: 'merge'
  });

  debug(`merge::message: ${mergeAttempt.data.message}`);
  debug(`merge::merged: ${mergeAttempt.data.merged}`);

  if (!mergeAttempt.data.merged) {
    throw new ComponentActionError('PR #${prNumber} merge attempt failed');
  }
};

export default async function (context: RunnerContext, options: InvokerOptions) {
  if (!options.npmToken)
    throw new ComponentActionError('missing required option `npmToken`');

  if (!options.githubToken)
    throw new ComponentActionError('missing required option `githubToken`');

  if (!options.gpgPrivKeyArmored)
    throw new ComponentActionError('missing required option `gpgPrivKeyArmored`');

  if (!options.gpgPassphrase)
    throw new ComponentActionError('missing required option `gpgPassphrase`');

  if (!options.codecovToken) debug('no codecov token provided (OK)');

  const {
    shouldSkipCi,
    shouldSkipCd,
    commitSha,
    hasPrivate,
    canRelease,
    canAutomerge,
    currentBranch,
    hasDeploy,
    committer,
    prNumber,
    retryCeilingSeconds
  } = await metadataDownload(context, {
    enableFastSkips: true,
    ...options,
    repository: {
      ...(typeof options.repository != 'boolean' ? options.repository : {}),
      checkoutRef: false
    }
  });

  if (!shouldSkipCi && !shouldSkipCd) {
    // * Download, unpack, and verify build artifact
    await downloadPaths(`build-${process.env.RUNNER_OS}-${commitSha}`);

    if (existsSync('./node_modules')) {
      throw new ComponentActionError(
        'illegal build artifact: encountered unexpected node_modules'
      );
    }

    // * Upload coverage data to codecov
    await execa('bash', ['<(curl -s https://codecov.io/bash)'], {
      shell: 'bash',
      stdio: 'inherit',
      env: {
        CODECOV_TOKEN: options.codecovToken,
        // ? Make sure codecov only gets the secrets it needs
        GITHUB_TOKEN: 'null',
        GH_TOKEN: 'null'
      }
    });

    // * Protect old package.json
    await execa('mv', ['package.json', 'package.json-actual'], { stdio: 'inherit' });

    // * Install privileged npm dependencies
    await installPrivilegedDependencies();

    // * Restore old package.json
    await execa('mv', ['package.json-actual', 'package.json'], { stdio: 'inherit' });

    if (canRelease) {
      await configureGpg(options.gpgPrivKeyArmored, options.gpgPassphrase, committer);

      // * Attempt to release
      await execa('npx', ['--no-install', 'semantic-release'], {
        stdio: 'inherit',
        env: {
          NPM_IS_PRIVATE: hasPrivate ? 'true' : 'false',
          NPM_TOKEN: options.npmToken,
          GH_TOKEN: options.githubToken,
          SHOULD_UPDATE_CHANGELOG: currentBranch == 'main' ? 'true' : 'false',
          SHOULD_DEPLOY: hasDeploy ? 'true' : 'false',
          GIT_AUTHOR_NAME: committer.name,
          GIT_AUTHOR_EMAIL: committer.email,
          GIT_COMMITTER_NAME: committer.name,
          GIT_COMMITTER_EMAIL: committer.email
        }
      });
    } else if (canAutomerge) {
      if (!prNumber)
        throw new ComponentActionError('could not get PR number from metadata');

      const ms2s = (ms: number) => Math.trunc(ms / 1000);
      await retry(() => automerge(options.githubToken as string, prNumber), {
        maxAttempts: Infinity,
        maxTotalElapsedMs: retryCeilingSeconds,
        maxJitterMs: 5000,
        minDelayMs: 10000,
        maxDelayMs: 30000,
        onFailure(lastError, attempts, nextAttemptMs, totalElapsedMs) {
          const afterText = `after ${ms2s(
            totalElapsedMs
          )} seconds and ${attempts} attempts`;

          if (lastError instanceof RetryError) {
            core.info(
              `Auto-merge experienced a transient failure ${afterText}. Next attempt in ${ms2s(
                nextAttemptMs
              )} seconds. Details: ${lastError.message}`
            );
            return true;
          } else if (lastError instanceof SkipError) {
            core.info(`Auto-merge aborted ${afterText}. Details: ${lastError.message}`);
            return false;
          } else {
            throw new ComponentActionError(
              `Auto-merge permanently failed ${afterText}. Details: ${lastError}`
            );
          }
        },
        onLimitReached(lastError, attempts, _, totalElapsedMs) {
          throw new ComponentActionError(
            `Auto-merge permanently failed after ${ms2s(
              totalElapsedMs
            )} seconds and ${attempts} attempts. Details: ${lastError}`
          );
        }
      });
    } else throw new ComponentActionError('failed to determine proper routine');

    if (currentBranch == 'main') {
      await configureGpg(options.gpgPrivKeyArmored, options.gpgPassphrase, committer);

      // * Check for any Projector updates
      await execa('npx', ['--no-install', '@xunnamius/projector', 'sync'], {
        stdio: 'inherit',
        env: {
          GH_TOKEN: options.githubToken,
          GIT_CONFIG_NAME: committer.name,
          GIT_CONFIG_EMAIL: committer.email
        }
      });
    }
  } else debug(`skipped component action "${ComponentAction.SmartDeploy}"`);
}
