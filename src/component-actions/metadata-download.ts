import { name as pkgName } from '../../package.json';
import { CloneOptions, ComponentAction, NodeOptions } from '../../types/global';
import { installNode } from '../utils/install';
import { cloneRepository, downloadPaths } from '../utils/github';
import { setupEnv } from '../utils/env';
import { ComponentActionError } from '../error';
import { UPLOADED_METADATA_PATH } from '../index';
import debugFactory from 'debug';
import core from '@actions/core';
import os from 'os';

import type { JsonRegExp } from '@xunnamius/types';
import type { Metadata, RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.MetadataDownload}`);

export default async function (
  context: RunnerContext,
  options: InvokerOptions
): Promise<Metadata> {
  if (!options.githubToken) {
    throw new ComponentActionError('missing required option `githubToken`');
  }

  options.forceWarnings = !!options.forceWarnings;
  options.npmToken = options.npmToken || undefined;

  const artifactKey = `metadata-${process.env.RUNNER_OS}-${context.sha}`;

  try {
    debug(`downloading from artifact key ${artifactKey}`);
    await downloadPaths(artifactKey, os.tmpdir());
  } catch (e) {
    throw new ComponentActionError(`failed to acquire metadata artifact: ${e}`);
  }

  let metadata: Metadata;

  try {
    metadata = require(UPLOADED_METADATA_PATH);

    metadata.ciSkipRegex &&
      (metadata.ciSkipRegex = RegExp(
        (metadata.ciSkipRegex as JsonRegExp).source,
        (metadata.ciSkipRegex as JsonRegExp).flags
      ));

    metadata.cdSkipRegex &&
      (metadata.cdSkipRegex = RegExp(
        (metadata.cdSkipRegex as JsonRegExp).source,
        (metadata.cdSkipRegex as JsonRegExp).flags
      ));
  } catch (e) {
    throw new ComponentActionError(`failed to import metadata artifact: ${e}`);
  }

  setupEnv(metadata);

  if (options.forceWarnings) {
    !metadata.hasReleaseConfig &&
      core.warning(
        'no release config loaded: missing local semantic-release configuration file'
      );

    !metadata.hasDocs && core.warning('no `build-docs` script defined in package.json');

    !metadata.canUploadCoverage &&
      core.warning('no code coverage data will be uploaded during this run');

    (metadata.debugString || process.env.DEBUG) &&
      core.warning(
        `PIPELINE IS RUNNING IN DEBUG MODE: '${
          metadata.debugString || process.env.DEBUG
        }'`
      );
  }

  options.repository =
    options.repository === false
      ? false
      : {
          checkoutRef: false,
          branchOrTag: metadata.currentBranch,
          fetchDepth: 1,
          repositoryName: context.repo.repo,
          repositoryOwner: context.repo.owner,
          repositoryPath: '.',
          ...(typeof options.repository != 'boolean' ? options.repository : {})
        };

  options.node =
    options.node === false
      ? false
      : {
          version: 'latest',
          ...(typeof options.node != 'boolean' ? options.node : {})
        };

  if (options.repository) {
    debug(`cloning repository`);
    await cloneRepository(options.repository as CloneOptions, options.githubToken);
  } else debug('skipped cloning repository');

  if (options.node) {
    debug(`installing node version ${options.node.version}`);
    await installNode(
      { version: (options.node as NodeOptions).version },
      options.npmToken
    );
  }
  return metadata;
}
