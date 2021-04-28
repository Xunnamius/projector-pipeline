import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import { ComponentAction } from '../../types/global';
import { installPrivilegedDependencies } from '../utils/install';
import { downloadPaths } from '../utils/github';
import { existsSync } from 'fs';
import { toss } from 'toss-expression';
import metadataDownload from './metadata-download';
import debugFactory from 'debug';
import execa from 'execa';

import type { RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.SmartDeploy}`);

export default async function (context: RunnerContext, options: InvokerOptions) {
  !options.npmToken &&
    toss(new ComponentActionError('missing required option `npmToken`'));

  !options.githubToken &&
    toss(new ComponentActionError('missing required option `githubToken`'));

  !options.gpgPrivateKey &&
    toss(new ComponentActionError('missing required option `gpgPrivateKey`'));

  !options.gpgPassphrase &&
    toss(new ComponentActionError('missing required option `gpgPassphrase`'));

  !options.codecovToken && debug('no codecov token provided (OK)');

  const {
    shouldSkipCi,
    shouldSkipCd,
    commitSha,
    hasPrivate,
    canRelease,
    canAutomerge
  } = await metadataDownload(context, {
    enableFastSkips: true,
    repository: {
      checkoutRef: false
    },
    ...options
  });

  if (!shouldSkipCi && !shouldSkipCd) {
    // * Download, unpack, and verify build artifact
    await downloadPaths(`build-${process.env.RUNNER_OS}-${commitSha}`);

    if (existsSync('./node_modules')) {
      throw new ComponentActionError(
        'illegal build artifact: encountered unexpected node_modules'
      );
    }

    if (canRelease) {
      await execa('mv', ['package.json', 'package.json-actual'], { stdio: 'inherit' });
      await execa('mv', ['package.json-actual', 'package.json'], { stdio: 'inherit' });

      // * Install npm dependencies
      await installPrivilegedDependencies();

      // * Setup GPG auth
      // TODO: Setup GPG (see gpg action source)

      // * Attempt to release
      await execa('npx', ['--no-install', 'semantic-release'], {
        stdio: 'inherit',
        env: { NPM_IS_PRIVATE: hasPrivate ? 'true' : undefined }
      });
    } else if (canAutomerge) {
      // TODO: On auto-merge, don't retry on anything less than 500 except 408,
      // TODO: 429, and the expected retry codes
    }
  } else debug(`skipped component action "${ComponentAction.SmartDeploy}"`);
}
