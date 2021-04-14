import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { ComponentActionError } from '../error';
import { setupEnv } from '../utils/setup-env';
import { context } from '@actions/github';
import { accessSync, readFileSync, writeFileSync, constants as fs } from 'fs';
import { uploadPaths } from '../utils/actions-artifact';
import debugFactory from 'debug';
import core from '@actions/core';
import execa from 'execa';
import os from 'os';

import {
  GLOBAL_PIPELINE_CONFIG_URI,
  GLOBAL_METADATA_TMPDIR,
  UPLOADED_METADATA_TMPDIR
} from '../index';

import type {
  CreateMutable,
  LocalPipelineConfig,
  GlobalPipelineConfig,
  CheckoutOptions,
  InvokerOptions,
  Metadata
} from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.MetadataCollect}`);

export default async function (options: InvokerOptions = {}): Promise<Metadata> {
  if (!options.githubToken) {
    throw new ComponentActionError('missing required option `githubToken`');
  } else core.setSecret(options.githubToken);

  options.uploadArtifact = !!options.uploadArtifact;
  options.checkout = options.checkout ?? true;
  options.setupNode = options.setupNode ?? true;
  options.enableFastSkips = options.enableFastSkips ?? true;

  if (options.checkout) {
    debug(`running @actions/checkout`);

    const opts = (options.checkout =
      typeof options.checkout != 'boolean' ? options.checkout : {});

    (core.getInput as CreateMutable<typeof core.getInput>) = (
      name: keyof CheckoutOptions
    ) => opts[name]?.toString();

    // TODO: fixme
    // await getSource(gitSourceSettings);
  }

  debug(`downloading global default metadata from ${GLOBAL_PIPELINE_CONFIG_URI}`);

  await execa(
    'curl',
    ['-o', GLOBAL_METADATA_TMPDIR, '-LJO', GLOBAL_PIPELINE_CONFIG_URI],
    {
      stdio: 'inherit'
    }
  );

  let globalConfig: GlobalPipelineConfig;
  let localConfig: Partial<LocalPipelineConfig> = {};

  debug(`coalescing pipeline configurations`);

  try {
    globalConfig = JSON.parse(
      readFileSync(GLOBAL_METADATA_TMPDIR, { encoding: 'utf-8' })
    );
  } catch (e) {
    throw new ComponentActionError(`failed to parse global pipeline config: ${e}`);
  }

  try {
    localConfig = JSON.parse(
      readFileSync('.github/pipeline.config.js', { encoding: 'utf-8' })
    );
  } catch (e) {
    core.warning(
      `no optional local config loaded: failed to parse local pipeline config`
    );
    debug(`no local config loaded: failed to parse local pipeline config: ${e}`);
  }

  debug(`collecting metadata`);

  const metadata: Metadata = {
    ciSkipRegex: localConfig.ciSkipRegex || globalConfig.ciSkipRegex,
    cdSkipRegex: localConfig.cdSkipRegex || globalConfig.cdSkipRegex,
    shouldSkipCi: false, // ? Determined later
    shouldSkipCd: false, // ? Determined later
    nodeCurrentVersion: localConfig.nodeCurrentVersion || globalConfig.nodeCurrentVersion,
    nodeTestVersions: localConfig.nodeTestVersions || globalConfig.nodeTestVersions,
    webpackTestVersions:
      localConfig.webpackTestVersions || globalConfig.webpackTestVersions,
    commitSha: context.sha,
    currentBranch: context.ref.split('/').slice(2).join('/'),
    prNumber: context.payload.pull_request?.number || null,
    canRelease: false, // ? Determined later
    canAutomerge: false, // ? Determined later
    canRetryAutomerge: localConfig.canRetryAutomerge || globalConfig.canRetryAutomerge,
    canUploadCoverage: localConfig.canUploadCoverage || globalConfig.canUploadCoverage,
    hasDeploy: false, // ? Determined later
    hasReleaseConfig: false, // ? Determined later
    hasDocs: false, // ? Determined later
    hasExternals: false, // ? Determined later
    hasIntegrationNode: false, // ? Determined later
    hasIntegrationExternals: false, // ? Determined later
    hasIntegrationClient: false, // ? Determined later
    hasIntegrationWebpack: false, // ? Determined later
    debugString: localConfig.debugString || null,
    committer: {
      name: localConfig.committer?.name || globalConfig.committer.name,
      email: localConfig.committer?.email || globalConfig.committer.email
    },
    npmAuditFailLevel: localConfig.npmAuditFailLevel || globalConfig.npmAuditFailLevel,
    artifactRetentionDays:
      localConfig.artifactRetentionDays || globalConfig.artifactRetentionDays,
    releaseRepoOwnerWhitelist: globalConfig.releaseRepoOwnerWhitelist.map((el) =>
      el.toLowerCase()
    ),
    releaseActorWhitelist: globalConfig.releaseActorWhitelist,
    automergeActorWhitelist: globalConfig.automergeActorWhitelist,
    npmIgnoreDistTags: globalConfig.npmIgnoreDistTags
  };

  if (context.eventName == 'pull_request' && !metadata.prNumber) {
    throw new ComponentActionError('failed to determine PR number given PR event type');
  }

  setupEnv(metadata);

  const { stdout: lastCommitMessage } = await execa('git', [
    'log',
    '-1',
    '--pretty=format:"%s"'
  ]);

  debug(`lastCommitMessage: ${lastCommitMessage}`);

  metadata.shouldSkipCi = metadata.ciSkipRegex.test(lastCommitMessage);
  metadata.shouldSkipCd =
    metadata.shouldSkipCi || metadata.cdSkipRegex.test(lastCommitMessage);

  if (!options.enableFastSkips || !metadata.shouldSkipCi) {
  } else {
    metadata.canRelease =
      metadata.releaseRepoOwnerWhitelist.includes(context.repo.owner.toLowerCase()) &&
      metadata.releaseActorWhitelist.includes(context.actor) &&
      context.eventName != 'pull_request';
    metadata.canAutomerge =
      metadata.automergeActorWhitelist.includes(context.actor) &&
      context.eventName == 'pull_request' &&
      !context.payload.pull_request?.draft;

    if (options.setupNode) {
      debug(`running @actions/setup-node`);

      options.setupNode = typeof options.setupNode != 'boolean' ? options.setupNode : {};

      // ? See: https://github.com/actions/setup-node/blob/main/src/main.ts
      void os;
      // const version =
      //   options.setupNode.nodeVersion ||
      //   options.setupNode.version ||
      //   metadata.nodeCurrentVersion;

      // const info = await getNode(
      //   version,
      //   !!options.setupNode.stable,
      //   !!options.setupNode.checkLatest,
      //   !options.setupNode.token ? undefined : `token ${options.setupNode.token}`,
      //   options.setupNode.architecture || os.arch()
      // );

      // debug(`node installer info for version "${version}": %O`, info);
    }

    const { stdout: rawTaskList } = await execa('npm', ['run', 'list-tasks']);
    const taskList = rawTaskList.split('\n');

    try {
      accessSync('./release.config.js', fs.R_OK);
      metadata.hasReleaseConfig = true;
    } catch {
      metadata.hasReleaseConfig = false;
    }

    metadata.hasDeploy = taskList.includes('deploy');
    metadata.hasDocs = taskList.includes('build-docs');
    metadata.hasExternals = taskList.includes('build-externals');
    metadata.hasIntegrationNode = taskList.includes('test-integration-node');
    metadata.hasIntegrationExternals = taskList.includes('test-integration-externals');
    metadata.hasIntegrationClient = taskList.includes('test-integration-client');
    metadata.hasIntegrationWebpack = taskList.includes('test-integration-webpack');

    if (metadata.hasExternals != metadata.hasIntegrationExternals) {
      throw new ComponentActionError(
        'expected both 1) `build-externals` and 2) `test-integration-externals` ' +
          'scripts to be defined in package.json'
      );
    } else if (!metadata.hasDocs) {
      core.warning('no `build-docs` script defined in package.json');
    } else if (!metadata.canUploadCoverage) {
      core.warning('no code coverage data will be uploaded during this run');
    }
  }

  debug('metadata: %O', metadata);

  if (options.uploadArtifact) {
    writeFileSync(UPLOADED_METADATA_TMPDIR, JSON.stringify(metadata));
    await uploadPaths(
      [UPLOADED_METADATA_TMPDIR],
      `metadata-${process.env.RUNNER_OS}-${metadata.commitSha}`,
      metadata.artifactRetentionDays
    );
  } else debug('not uploading metadata artifact');

  return metadata;
}
