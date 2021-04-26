import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import { ComponentAction } from '../../types/global';
import { installPrivilegedDependencies } from '../utils/install';
import { downloadPaths } from '../utils/github';
import metadataDownload from './metadata-download';
import debugFactory from 'debug';
import execa from 'execa';

import type { RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.SmartDeploy}`);

export default async function (context: RunnerContext, options: InvokerOptions) {
  if (!options.npmToken)
    throw new ComponentActionError('missing required option `npmToken`');

  if (!options.githubToken)
    throw new ComponentActionError('missing required option `githubToken`');

  if (!options.gpgPrivateKey)
    throw new ComponentActionError('missing required option `gpgPrivateKey`');

  if (!options.gpgPassphrase)
    throw new ComponentActionError('missing required option `gpgPassphrase`');

  if (!options.codecovToken) debug('no codecov token provided (OK)');

  // TODO: still do semantic-release but do not npm publish if private == true
  // TODO: do not checkout if only automerge
  // TODO: replace all metadata calls with destructuring style project-wide
  const { shouldSkipCi, shouldSkipCd, commitSha } = await metadataDownload(context, {
    enableFastSkips: true,
    ...options
  });

  if (!shouldSkipCi && !shouldSkipCd) {
    // * Prepare environment
    // TODO: setup env for GPG and semantic-release
    // TODO: checkout repo but with empty working tree to ./artifact
    // TODO: setup node 15

    await installPrivilegedDependencies();

    // * Download, unpack, and verify build artifact
    await downloadPaths(`build-${process.env.RUNNER_OS}-${commitSha}`, './artifact');
    // TODO: check ./artifact does not have a node_modules or .git directory and error if it does

    // * Merge privileged dependencies with build artifact
    await execa('mv', ['node_modules', './artifact'], { stdio: 'inherit' });
    await execa('cd', ['./artifact'], { stdio: 'inherit' });

    // * Setup GPG auth
    // TODO: Setup GPG (see gpg action source)

    // * Attempt to release
    await execa('npx', ['--no-install', 'semantic-release'], { stdio: 'inherit' });
  } else debug(`skipped component action "${ComponentAction.SmartDeploy}"`);

  // TODO: On auto-merge, don't retry on anything less than 500 except 408, 429,
  // TODO: and the expected retry codes
}
