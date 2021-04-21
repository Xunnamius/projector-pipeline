/**
 * This object contains the default configuration for the GitHub Actions that
 * comprise the build-test-deploy pipeline.
 *
 * ! Note: each property in `GlobalPipelineConfig` is always required below!
 */
module.exports = {
  // * The name and email used to author commits and interact with GitHub.
  // ! This should correspond to the identity of the GH_TOKEN secret.
  committer: {
    name: 'xunn-bot',
    email: 'bot@xunn.io'
  },

  // * The version of node to load into each job.
  nodeCurrentVersion: '15.x',

  // * Node versions to test against.
  nodeTestVersions: ['12.x', '14.x'],

  // * Webpack versions to test against.
  webpackTestVersions: ['5.x'],

  // * Regular expressions (w/ proper escaping) for skipping CI/CD.
  ciSkipRegex: /\[skip ci\]|\[ci skip\]/i,
  cdSkipRegex: /\[skip cd\]|\[cd skip\]/i,

  // * A list of `github.repository_owner` where automated releases may occur.
  // * Unless running within one of the listed namespaces, workflows will not
  // * be allowed to run.
  // ! WARNING: repository owner name comparisons are case INsensitive.
  releaseRepoOwnerWhitelist: ['xunnamius', 'ergodark', 'nhscc'],

  // * A list of exact logins (github.actor) allowed to trigger automated
  // * releases and deployments if all checks pass.
  // ! WARNING #1: repository owner name comparisons are case INsensitive.
  // ! WARNING #2: any user in this list can release new software to your users.
  // ! Be very careful to whom you give this power!
  releaseActorWhitelist: ['xunnamius'],

  // * A list of exact GitHub logins (github.actor) whose PRs will be
  // * automatically merged if all checks pass
  // ! WARNING #1: repository owner name comparisons are case INsensitive.
  // ! WARNING #2: this allows 3rd party code to be merged and released without
  // ! any human oversight. Only allow this for trusted actors (e.g. your bot).
  automergeActorWhitelist: ['dependabot[bot]', 'xunn-bot'],

  // * Should auto-merge be retried on failure even when the PR appears
  // * unmergeable? Uses exponential back-off internally.
  // ! WARNING: leaving this as `true` might waste Actions minutes and $$$ in
  // ! private repositories!
  canRetryAutomerge: true,

  // * NPM audit will fail upon encountering problems of at least the specified
  // * severity.
  npmAuditFailLevel: 'high',

  // * Names of NPM dist-tags that will never be automatically pruned during
  // * cleanup workflows. Those dist-tags that have corresponding release
  // * branches will never be pruned regardless of this setting.
  npmIgnoreDistTags: ['latest'],

  // * Attempt to upload project coverage data to codecov if `true`.
  canUploadCoverage: true,

  // * How many days GitHub should keep uploaded artifacts around.
  // ! 90 days is GitHub's default, but this should be dramatically lowered for
  // ! private repos where artifact storage costs $$$.
  artifactRetentionDays: 90
};
