/**
 * Removes 'readonly' attributes from a type's properties.
 */
export type CreateMutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * List (enum) of available component actions.
 *
 * Each value of this enum must correspond to the following filename:
 * `src/component-actions/${enum-value}.ts`.
 */
export enum ComponentAction {
  Audit = 'audit',
  Build = 'build',
  CleanupNpm = 'cleanup-npm',
  Lint = 'lint',
  MetadataCollect = 'metadata-collect',
  MetadataDownload = 'metadata-download',
  SmartDeploy = 'smart-deploy',
  TestIntegrationClient = 'test-integration-client',
  TestIntegrationExternals = 'test-integration-externals',
  TestIntegrationNode = 'test-integration-node',
  TestIntegrationWebpack = 'test-integration-webpack',
  TestUnit = 'test-unit',
  VerifyNpm = 'verify-npm'
}

/**
 * The return type of `await import(...)` when importing a component action
 * file.
 */
export type ImportedComponentAction = {
  default: (
    options?: InvokerOptions
  ) => Promise<Metadata | Record<string, unknown> | void>;
};

/**
 * Settings expected by `@actions/checkout`.
 *
 * If `bareWorkingTree` is true, all files in the working tree are destroyed.
 * This is useful when also downloading and unpacking the `build` component
 * action's resultant artifact, thus replacing the old working tree safely (e.g.
 * without running `npm install`) and in its entirely (i.e. ready for further
 * git commands).
 *
 * See also: https://github.com/actions/checkout/blob/main/src/main.ts
 */
export type CheckoutOptions = { bareWorkingTree: boolean }; // TODO: finish this

/**
 * Settings expected by `@actions/setup-node`.
 *
 * See also: https://github.com/actions/setup-node/blob/main/src/main.ts
 */
export type SetupNodeOptions = {
  nodeVersion?: string;
  version?: string;
  architecture?: string;
  token?: string;
  stable?: boolean;
  checkLatest?: boolean;
};

/**
 * Local pipeline configuration settings.
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
   * @warning This node version will also be used to run unit and integration
   * tests as part of a Actions test matrix that includes both
   * `nodeCurrentVersion` and `nodeTestVersions`.
   */
  nodeCurrentVersion: string;
  /**
   * The versions of node to run unit and integration tests against.
   *
   * @warning This already includes `nodeCurrentVersion` and specifying it here
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
   * If not `null` or `""`, debugging will be activated via
   * `DEBUG='${debugString}'`.
   */
  debugString: string | null;
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
   * The NPM security audit threshold that if met immediately fails the
   * pipeline.
   */
  npmAuditFailLevel: string;
  /**
   * The number of days to keep artifacts around. Must be an integer between 1
   * and 90.
   */
  artifactRetentionDays: number;
};

/**
 * Global pipeline configuration settings.
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
   * Names of NPM dist-tags that will never be automatically pruned during
   * cleanup workflows. Those dist-tags that have corresponding release
   * branches will never be pruned regardless of this setting.
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
   * If `true`, `ComponentAction.MetadataDownload` will reissue any pipeline
   * warnings caused by (downloaded) metadata. These warnings are always
   * reported by the `metadata-collect` component action already, usually making
   * reissuing the warnings redundant.
   *
   * This setting is useful when manually invoking the `metadata-download`
   * component action in a workflow where no other metadata component actions
   * have yet run. This ensures pipeline warnings appear in both the original
   * workflow and the secondary workflow so that they are not accidentally
   * missed during review.
   *
   * @default false
   */
  reissueWarnings?: boolean;

  /**
   * If `true`, `ComponentAction.MetadataCollect` will terminate collecting
   * metadata immediately upon determining `shouldSkipCi == true`. This saves
   * time by allowing a partially initialized metadata object to be returned.
   *
   * Note: uninitialized values are `false` or `null` as their type allows.
   * Metadata members will never be undefined.
   *
   * @default true
   */
  enableFastSkips?: boolean;

  /**
   * If `true` or an instance of `CheckoutSettings`, a repository will be
   * checked out using `@actions/checkout` action. See the `pipeline.config.js`
   * files for configuration details.
   *
   * @default true
   */
  checkout?: boolean | Partial<CheckoutOptions>;

  /**
   * If `true` or an instance of `SetupNodeSettings`, node will be
   * installed and configured by the `@actions/checkout` action. See the
   * `pipeline.config.js` files for configuration details.
   *
   * @default true
   */
  setupNode?: boolean | Partial<SetupNodeOptions>;

  /**
   * Contains the NPM token. Usually `${{ secrets.NPM_TOKEN }}` is the correct
   * value. Do not specify if not required.
   */
  npmToken?: string;

  /**
   * Contains the NPM token. Usually `${{ secrets.GH_TOKEN }}` is the correct
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
  shouldSkipCi: boolean;
  shouldSkipCd: boolean;
  commitSha: string;
  currentBranch: string;
  prNumber: number | null;
  canRelease: boolean;
  canAutomerge: boolean;
  hasDeploy: boolean;
  hasReleaseConfig: boolean;
  hasDocs: boolean;
  hasExternals: boolean;
  hasIntegrationNode: boolean;
  hasIntegrationExternals: boolean;
  hasIntegrationClient: boolean;
  hasIntegrationWebpack: boolean;
} & GlobalPipelineConfig &
  LocalPipelineConfig;
