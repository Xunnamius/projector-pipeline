import { name as pkgName } from '../package.json';
import debugFactory from 'debug';
import execa from 'execa';
import os from 'os';
import cache from '@actions/cache';
import artifact from '@actions/artifact';
import core from '@actions/core';
import { ComponentActionError, SkipCdError, SkipCiError } from './error';

const debug = debugFactory(`${pkgName}:index`);

// TODO: leave if-debug warning in workflow files (move under metadata-*)

/**
 * List (enum) of available component actions.
 */
export enum ComponentAction {
  Audit = 'audit',
  Build = 'build',
  CleanupNpm = 'cleanupNpm',
  Lint = 'lint',
  MetadataCollect = 'metadataCollect',
  MetadataDownload = 'metadataDownload',
  ReleaseAutomerge = 'releaseAutomerge',
  TestIntegrationClient = 'testIntegrationClient',
  TestIntegrationExternals = 'testIntegrationExternals',
  TestIntegrationNode = 'testIntegrationNode',
  TestIntegrationWebpack = 'testIntegrationWebpack',
  TestUnit = 'testUnit',
  VerifyNpm = 'verifyNpm'
}

/**
 * Options for `invokeComponentAction`.
 */
export type InvokerOptions = {
  /**
   * If `true`, ComponentAction.MetadataCollect will upload its results as a
   * metadata artifact.
   *
   * @default false
   */
  uploadArtifact?: boolean;

  /**
   * If `true`, ComponentAction.MetadataDownload will reissue any pipeline
   * warnings caused by downloaded metadata.
   *
   * @default false
   */
  reissueWarnings?: boolean;
};

// TODO: document this
const setEnv = (
  metadata: ReturnType<typeof componentActions[ComponentAction.MetadataCollect]>
) => {
  // TODO: set DEBUG, issue set-env commands
  void metadata;
};

/**
 * Install dependencies using `npm ci`; peer dependencies are installed manually
 * if using `npm@<7`.
 */
const installDependencies = async () => {
  // TODO: handle caching (restore npm cache; if fail, download and upload new cache)
};

/**
 * Install privileged dependencies using `npm install` and the global (remote)
 * `package.json file`; peer dependencies are installed manually if using
 * `npm@<7`.
 */
const installPrivilegedDependencies = async () => {
  // TODO: no caching
};

// TODO: document this
const validateRuntime = () => {
  // TODO: ensure environment/context has necessary data and proper event type
};

// TODO: document this
const cachePaths = async (paths: string[], cacheKey: string) => {
  debug(`caching paths %O with key "${cacheKey}"`, paths);
  await cache.saveCache(paths, cacheKey);
  // TODO: throw if cache access fails
};

// TODO: document this
const uncachePaths = async (
  paths: string[],
  cacheKey: string,
  restoreKeys?: string[]
) => {
  debug(`restoring cached paths %O with key "${cacheKey}"`, paths);
  await cache.restoreCache(paths, cacheKey, restoreKeys);
  // TODO: throw if cache access fails
};

// TODO: document this
const uploadPaths = async (paths: string[], artifactKey: string) => {
  // TODO: handle no-files-found error and retention-days
  void paths, artifactKey;
};

// TODO: document this
const downloadPaths = async (artifactKey: string, destDir?: string) => {
  const response = await artifact.create().downloadArtifact(artifactKey, destDir);
  void response;
  // TODO: do something with response
};

// TODO: check all of the canX metadata keys and skip/fail stuff that isn't
// TODO: supposed to be running (or if skipCi/Cd is true)
/**
 * Component action implementations.
 * ? One of `metadataCollect` or `metadataDownload` should always be called
 * ? at the top of each component action or pipeline behavior is undefined.
 */
export const componentActions = {
  async [ComponentAction.Audit]() {
    await execa(
      'npm',
      ['audit', `--audit-level=${(await this.metadataCollect()).npmAuditFailLevel}`],
      {
        stdio: 'inherit'
      }
    );

    return null;
  },

  async [ComponentAction.Build]() {
    const metadata = await this.metadataCollect();

    await installDependencies();
    await execa('npm', ['run', 'format'], { stdio: 'inherit' });
    await execa('npm', ['run', 'build-dist'], { stdio: 'inherit' });

    metadata.hasDocs
      ? await execa('npm', ['run', 'build-docs'], { stdio: 'inherit' })
      : core.warning('no `build-docs` script defined in package.json');

    await execa('npm', ['run', 'format'], { stdio: 'inherit' });
    await uncachePaths(['./coverage'], `coverage-${os.platform()}-${metadata.commitSha}`);
    await uploadPaths(
      ['./*', '!./**/node_modules', '!.git'],
      `build-${os.platform()}-${metadata.commitSha}`
    );

    return null;
  },

  async [ComponentAction.CleanupNpm]() {
    const metadata = await this.metadataCollect();

    // TODO: convert prune-dist-tags script to JavaScript implementation
    void metadata;

    return null;
  },

  async [ComponentAction.Lint]() {
    await this.metadataCollect();
    await installDependencies();
    await execa('npm', ['run', 'lint'], { stdio: 'inherit' });

    return null;
  },

  // TODO: note that this method DOES checkout/configure git repo
  async [ComponentAction.MetadataCollect](options?: InvokerOptions) {
    options = options || {};
    options.uploadArtifact = !!options.uploadArtifact;

    validateRuntime();

    // TODO: collect metadata and download global metadata (do a whitelist merge)
    // TODO: checkout commit
    // TODO: repository owner name comparisons are case insensitive
    // TODO: upload artifact if option says so
    const metadata = {} as ReturnType<
      typeof componentActions[ComponentAction.MetadataCollect]
    >;

    setEnv(metadata);

    return {
      ciSkipRegex: '',
      cdSkipRegex: '',
      nodeCurrentVersion: '',
      nodeTestVersions: [],
      webpackTestVersions: [],
      commitSha: '',
      currentBranch: '',
      prNumber: 0,
      canRelease: true,
      canAutomerge: true,
      canRetryAutomerge: true,
      canUploadCoverage: true,
      hasDeploy: true,
      hasReleaseConfig: true,
      hasDocs: true,
      hasExternals: true,
      hasIntegrationNode: true,
      hasIntegrationExternals: true,
      hasIntegrationClient: true,
      hasIntegrationWebpack: true,
      debugString: '',
      committer: {
        name: '',
        email: ''
      },
      // * What follows is JS-only information (i.e. not available to workflows)
      npmAuditFailLevel: '',
      artifactRetentionDays: 0,
      releaseRepoOwnerWhitelist: [],
      releaseActorWhitelist: [],
      automergeActorWhitelist: []
    };
  },

  // TODO: note that this method does NOT checkout/configure git repo
  async [ComponentAction.MetadataDownload](options?: InvokerOptions) {
    options = options || {};
    options.reissueWarnings = !!options.reissueWarnings;

    validateRuntime();

    // TODO: download metadata artifact
    const metadata = {} as ReturnType<
      typeof componentActions[ComponentAction.MetadataCollect]
    >;

    setEnv(metadata);

    return metadata;
  },

  async [ComponentAction.ReleaseAutomerge]() {
    // TODO: do not checkout if only automerge
    const metadata = await this.metadataDownload();

    // * Prepare environment
    // TODO: setup env for GPG and semantic-release
    // TODO: checkout repo (is necessary?) but with empty working tree to ./artifact

    await installPrivilegedDependencies();

    // * Download, unpack, and verify build artifact
    await downloadPaths(`build-${os.platform()}-${metadata.commitSha}`, './artifact');
    // TODO: check ./artifact does not have a node_modules or .git directory and error if it does

    // * Merge privileged dependencies with build artifact
    await execa('mv', ['node_modules', './artifact'], { stdio: 'inherit' });
    await execa('cd', ['./artifact'], { stdio: 'inherit' });

    // * Setup GPG auth
    // TODO: Setup GPG (see gpg action source)

    // * Attempt to release
    await execa('npx', ['--no-install', 'semantic-release'], { stdio: 'inherit' });

    return null;
  },

  async [ComponentAction.TestIntegrationClient]() {
    await this.metadataCollect();
    await installDependencies();
    await execa('npm', ['run', 'test-integration-client'], { stdio: 'inherit' });

    return null;
  },

  async [ComponentAction.TestIntegrationExternals]() {
    await this.metadataCollect();
    await installDependencies();
    await execa('npm', ['run', 'test-integration-externals'], { stdio: 'inherit' });

    return null;
  },

  async [ComponentAction.TestIntegrationNode]() {
    await this.metadataCollect();
    await installDependencies();
    await execa('npm', ['run', 'test-integration-node'], { stdio: 'inherit' });

    return null;
  },

  async [ComponentAction.TestIntegrationWebpack]() {
    await this.metadataCollect();
    await installDependencies();
    await execa('npm', ['run', 'test-integration-webpack'], { stdio: 'inherit' });

    return null;
  },

  async [ComponentAction.TestUnit]() {
    const metadata = await this.metadataCollect();

    await installDependencies();
    await execa('npm', ['run', 'test-unit'], { stdio: 'inherit' });

    metadata.canUploadCoverage
      ? await cachePaths(
          ['./coverage'],
          `coverage-${os.platform()}-${metadata.commitSha}`
        )
      : core.warning('no code coverage data will be collected for this run');

    return null;
  },

  async [ComponentAction.VerifyNpm]() {
    // TODO: exponential back-off attempts to npm install for a maximum of 5 minutes before giving up
    // TODO: test install package
    // TODO: if bin, npx them and look for 1) 0 exit code or 2) 1 exit code and a stderr starting with "fatal:"
    return null;
  }
};

/**
 * Return type of `invokeComponentAction`.
 */
export type InvokerResult = {
  action: ComponentAction;
  options: InvokerOptions;
  outputs: Record<string, unknown>;
};

/**
 * Invokes the specified component `action` with `options`, if given. Throws on
 * error, otherwise returns an InvokerResult object.
 */
export async function invokeComponentAction(
  action: ComponentAction,
  options?: InvokerOptions
): Promise<InvokerResult> {
  let outputs: InvokerResult['outputs'] = {};

  debug(
    'invocable component actions available: %O',
    Object.keys(ComponentAction).filter((k) => Number.isNaN(k))
  );

  try {
    options = options || {};
    debug(`invoking component action "${action}" with options: %O`, options);
    outputs = (await componentActions[action](options)) || {};
  } catch (e) {
    if (e instanceof SkipCiError || e instanceof SkipCdError) throw e;
    else {
      throw new ComponentActionError(
        `${action} component action invocation failed: ${e}`
      );
    }
  }

  return {
    action,
    // ? Don't return the original options object reference
    options: { ...options },
    outputs
  };
}
