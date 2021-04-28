import type { Promisable } from 'type-fest';

/**
 * Utility type for testing Execa
 */
export type ExecaReturnType = ReturnType<typeof import('execa')>;

export type AttemptOptions = {
  /**
   * The maximum number of attempts before an error is thrown. `0` means no
   * limit. Must be a non-negative number or behavior is undefined.
   *
   * @default 10
   */
  maxAttempts: number;
  /**
   * The maximum total runtime in milliseconds before an error is thrown. `0`
   * means no limit. Counting starts when `attempt()` is first called. Must be a
   * non-negative number or behavior is undefined.
   *
   * ⚠️ Note that this will _not_ limit the runtime of `fn` itself in any way!
   * The total elapsed time limit is only assessed _after_ `fn` runs, however
   * long that takes!
   *
   * @default 0
   */
  maxTotalElapsedMs: number;
  /**
   * The maximum amount of time in milliseconds between attempts. `0` means no
   * limit. Must be a non-negative number (greater than `minDelayMs` if
   * non-zero) or behavior is undefined.
   *
   * ⚠️ Note that, if `maxJitterMs >= 0`, `maxDelayMs + maxJitterMs` becomes the
   * _actual_ maximum possible delay interval.
   *
   * @default 0
   */
  maxDelayMs: number;
  /**
   * The minimum amount of time in milliseconds between attempts. Must be a
   * positive number or behavior is undefined.
   *
   * @default 1
   */
  minDelayMs: number;
  /**
   * Every delay will be increased by `Math.random() * maxJitterMs`
   * milliseconds, ensuring smoother concurrent invocations. Must be a
   * non-negative number or behavior is undefined.
   *
   * @default 0
   */
  maxJitterMs: number;
  /**
   * This function is called whenever the attempted function rejects/throws
   * _and no limits have been exceeded_. It receives the most recent error, the
   * current attempt number (starting at 1), the next delay period, and the
   * total elapsed time since the `attempt()` was first called.
   *
   * This function should return `true` if another attempt should be considered,
   * or `false` to abort execution, which will immediately throw an error. You
   * can also throw your own error instead.
   *
   * @default () => true
   */
  onFailure: (
    lastError: unknown,
    attemptNumber: number,
    nextDelayMs: number,
    totalElapsedMs: number
  ) => Promisable<boolean>;
  /**
   * If `true`, an error will be thrown if `maxAttempts` or `maxTotalElapsedMs`
   * are exceeded. ⚠️ If `false`, no errors will be thrown and `attempt()` will
   * resolve (probably not what you want).
   *
   * If set to a function, it is called instead of throwing an error. It
   * receives the most recent error, the current (max) attempt number (starting
   * at 1), the total elapsed time since `attempt()` function was first called,
   * and the reason this function was called.
   *
   * @default true
   */
  onLimitReached:
    | boolean
    | ((
        lastError: unknown,
        attemptNumber: number,
        reason: 'attempts' | 'delay',
        totalElapsedMs: number
      ) => Promisable<void>);
};

/**
 * List (enum) of available component actions.
 *
 * Each value of this enum must correspond to the following filename:
 * `src/component-actions/${enum-value}.ts`.
 */
export enum ComponentAction {
  Audit = 'audit',
  CleanupNpm = 'cleanup-npm',
  Lint = 'lint',
  MetadataCollect = 'metadata-collect',
  MetadataDownload = 'metadata-download',
  SmartDeploy = 'smart-deploy',
  TestIntegrationClient = 'test-integration-client',
  TestIntegrationExternals = 'test-integration-externals',
  TestIntegrationNode = 'test-integration-node',
  TestIntegrationWebpack = 'test-integration-webpack',
  TestUnitThenBuild = 'test-unit-then-build',
  VerifyRelease = 'verify-release'
}

/**
 * The return type of `await import(...)` when importing a component action
 * file.
 */
export type ComponentActionModule = { default: ComponentActionFunction };

/**
 * The shape of the context object available during every GitHub Actions
 * workflow run.
 */
export type RunnerContext = typeof import('@actions/github')['context'];

/**
 * The type signature of a ComponentAction function.
 */
export type ComponentActionFunction = (
  context: RunnerContext,
  options: InvokerOptions
) => Promise<Metadata | Record<string, unknown> | void>;

/**
 * Options expected by the `cloneRepository` utility function. Defaults are set
 * by the calling function and not `cloneRepository` itself.
 */
export type CloneOptions = {
  /**
   * The location on disk to where the repository will be cloned.
   *
   * @default (current working directory)
   */
  repositoryPath: string;
  /**
   * The clone target repository's namespace (owner).
   *
   * @default (the current repo name)
   */
  repositoryOwner: string;
  /**
   * The clone target repository's name.
   *
   * @default (the current repo name)
   */
  repositoryName: string;
  /**
   * The ref (branch or tag) to fetch. Use `checkoutRef` to checkout one of the
   * refs under this branch while cloning.
   *
   * @default metadata.currentBranch
   */
  branchOrTag: string;
  /**
   * The ref (commit, branch, tag, etc) to checkout or `false` if the working
   * tree should not be checked out after cloning the repo.
   *
   * This is useful when downloading and unpacking the `test-unit-then-build`
   * component action's resultant artifact and replacing the old working tree
   * safely (e.g. without running `npm install`) and in its entirely (i.e. ready
   * for further git commands).
   *
   * @default metadata.commitSha
   */
  checkoutRef: string | false;
  /**
   * The depth when fetching. `fetchDepth<=0` means no limit.
   *
   * @default 1
   */
  fetchDepth: number;
};

/**
 * Options expected by the `setupNode` utility function. Defaults, if any, are
 * set by the calling function and not `cloneRepository` itself.
 */
export type NodeOptions = {
  /**
   * A semver string. The highest version of Node satisfying this string will be
   * installed and configured.
   */
  version: string;
};

/**
 * Local pipeline configuration options.
 */
export type LocalPipelineConfig = {
  /**
   * A regular expression that determines if a commit message contains the CI
   * Skip pipeline command.
   */
  ciSkipRegex: RegExp;
  /**
   * A regular expression that determines if a commit message contains the CD
   * Skip pipeline command.
   */
  cdSkipRegex: RegExp;
  /**
   * The node version to install during metadata download/collection.
   *
   * ⚠️ This node version will also be used to run unit and integration
   * tests as part of a Actions test matrix that includes both
   * `nodeCurrentVersion` and `nodeTestVersions`.
   */
  nodeCurrentVersion: string;
  /**
   * The versions of node to run unit and integration tests against.
   *
   * ⚠️ This already includes `nodeCurrentVersion` and specifying it here
   * would be redundant (and potentially cause tests to be run twice!)
   */
  nodeTestVersions: string[];
  /**
   * The versions of webpack to webpack-specific integration tests against, if
   * applicable.
   */
  webpackTestVersions: string[];
  /**
   * If `true`, exponential back-off will be used when auto-merging PRs.
   */
  canRetryAutomerge: boolean;
  /**
   * If `true`, coverage data will be uploaded and analyzed by third parties.
   */
  canUploadCoverage: boolean;
  /**
   * If not `null`, `false`, or `""`, debugging will be activated via
   * `DEBUG='${debugString}'`. If `true`, the runtime `package.json` name will
   * be used, i.e. `DEBUG='${name}:*'`.
   */
  debugString: boolean | string | null;
  /**
   * The name and email used to create git commits, tags, and pushes.
   */
  committer: {
    /**
     * The name used to create git commits, tags, and pushes.
     */
    name: string;
    /**
     * The email used to create git commits, tags, and pushes.
     */
    email: string;
  };
  /**
   * The npm security audit threshold that if met immediately fails the
   * pipeline.
   */
  npmAuditFailLevel: string;
  /**
   * The maximum amount of time in seconds any "retry"-type operation can
   * continue retrying. This includes all exponential backoff steps.
   *
   * ⚠️ A 5 minute limit is hardcoded into pipeline workflows, so values
   * above ~250 might lead to undesirable VM hard stops.
   */
  retryCeilingSeconds: number;
  /**
   * The number of days to keep artifacts around. Must be an integer between 1
   * and 90.
   */
  artifactRetentionDays: number;
};

/**
 * Global pipeline configuration options.
 */
export type GlobalPipelineConfig = {
  /**
   * A list of `github.repository_owner` where automated releases may occur.
   * Unless running within one of the listed namespaces, workflows will not
   * be allowed to run. Repository owner name comparisons are case insensitive.
   */
  releaseRepoOwnerWhitelist: string[];
  /**
   * A list of exact logins (github.actor) allowed to trigger automated
   * releases and deployments if all checks pass.
   */
  releaseActorWhitelist: string[];
  /**
   * A list of exact GitHub logins (github.actor) whose PRs will be
   * automatically merged if all checks pass
   */
  automergeActorWhitelist: string[];
  /**
   * A regular expression that matches the npm dist-tags that will never be
   * pruned during cleanup workflows. Those dist-tags that have corresponding
   * release branches are already ignored regardless of this setting.
   */
  npmIgnoreDistTags: string[];
} & Omit<LocalPipelineConfig, 'debugString'>;

/**
 * Options for `invokeComponentAction`.
 */
export type InvokerOptions = {
  /**
   * If `true`, `ComponentAction.MetadataCollect` will upload its results as a
   * metadata artifact.
   *
   * @default false
   */
  uploadArtifact?: boolean;

  /**
   * If `true`, the `metadata-download` component action will reissue most
   * pipeline warnings triggered by the downloaded metadata. These warnings are
   * always reported by the `metadata-collect` component action already, usually
   * making reissuing the warnings redundant.
   *
   * ⚠️ This setting also causes `metadata-collect` to issue a warning when the
   * pipeline is in debug. Normally this output is suppressed.
   *
   * @default false
   */
  forceWarnings?: boolean;

  /**
   * If `true`, `ComponentAction.MetadataCollect` will terminate collecting
   * metadata immediately upon determining `shouldSkipCi == true`. This saves
   * time by allowing a partially initialized metadata object to be returned.
   *
   * ⚠️ Note: uninitialized values are `false` or `null` as their type allows.
   * Metadata members will never be undefined.
   *
   * @default true
   */
  enableFastSkips?: boolean;

  /**
   * If `true` or an instance of `CloneOptions`, a repository will be checked
   * out. See the `pipeline.config.js` files for configuration details.
   *
   * @default true
   */
  repository?: boolean | Partial<CloneOptions>;

  /**
   * If `true` or an instance of `NodeOptions`, node will be installed and
   * configured. See the `pipeline.config.js` files for configuration details.
   *
   * @default true
   */
  node?: boolean | Partial<NodeOptions>;

  /**
   * Contains the npm token. Usually `${{ secrets.NPM_TOKEN }}` is the correct
   * value. Do not specify if not required.
   */
  npmToken?: string;

  /**
   * Contains the npm token. Usually `${{ secrets.GH_TOKEN }}` is the correct
   * value. Do not specify if not required.
   */
  githubToken?: string;

  /**
   * Contains the Codecov coverage upload token. Usually
   * `${{ secrets.CODECOV_TOKEN }}` is the correct value. Do not specify if not
   * required.
   */
  codecovToken?: string;

  /**
   * Contains the GPG private key. Usually `${{ secrets.GPG_PRIVATE_KEY }}` is
   * the correct value. Do not specify if not required.
   */
  gpgPrivateKey?: string;

  /**
   * Contains the GPG private key passphrase. Usually
   * `${{ secrets.GPG_PASSPHRASE }}` is the correct value. Do not specify if not
   * required.
   */
  gpgPassphrase?: string;
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
 * Metadata collected by `ComponentActions.MetadataCollect` and returned by
 * `ComponentActions.MetadataDownload`. Some subset of this metadata is used as
 * output for said component actions. See `action.yml` for further details.
 */
export type Metadata = {
  packageName: string;
  packageVersion: string;
  releaseBranchConfig: typeof import('../release.config')['branches'];
  shouldSkipCi: boolean;
  shouldSkipCd: boolean;
  commitSha: string;
  currentBranch: string;
  prNumber: number | null;
  canRelease: boolean;
  canAutomerge: boolean;
  hasPrivate: boolean;
  hasBin: boolean;
  hasDeploy: boolean;
  hasDocs: boolean;
  hasExternals: boolean;
  hasIntegrationNode: boolean;
  hasIntegrationExternals: boolean;
  hasIntegrationClient: boolean;
  hasIntegrationWebpack: boolean;
} & GlobalPipelineConfig &
  LocalPipelineConfig;
