/**
 * This object contains the default configuration for the GitHub Actions that
 * comprise the build-test-deploy pipeline. Each property is required.
 */
module.exports = {
  // * The name and email used to author commits and interact with GitHub.
  // ! This should correspond to the identity associated w/ the GH_TOKEN secret.
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

  // * A list of GitHub `github.repository_owner` where automated releases may
  // * occur. Unless running within one of the listed namespaces, workflows will
  // * not be allowed to run.
  // ? Repository owner name comparisons are case insensitive.
  releaseRepoOwnerWhitelist: ['xunnamius', 'ergodark', 'nhscc'],

  // * A list of exact GitHub logins (github.actor) allowed to trigger
  // * automated releases if all checks pass.
  // ! WARNING #1: unlike releaseRepoOwnerWhitelist, matching is case sensitive.
  // ! WARNING #2: any user in this list can release new software to your users.
  // ! Be very careful to whom you give this power (usually only a few bots)!
  releaseActorWhitelist: ['dependabot[bot]', 'xunn-bot'],

  // * A list of exact GitHub logins (github.actor) whose PRs will be
  // * automatically merged if all checks pass
  // ! WARNING #1: unlike releaseRepoOwnerWhitelist, matching is case sensitive.
  // ! WARNING #2: this allows 3rd party code to be merged and released without
  // ! any human oversight. Only allow this for trusted actors (e.g. your bot).
  automergeActorWhitelist: ['dependabot[bot]', 'xunn-bot'],

  // * Should auto-merge be retried on failure even when the PR appears
  // * unmergeable? Uses exponential back-off internally.
  // ! WARNING: setting this to true might waste Actions minutes and $$$!
  canRetryAutomerge: true,

  // * NPM audit will fail upon encountering problems of at least the specified
  // * severity.
  npmAuditFailLevel: 'high',

  // * Attempt to upload project coverage data to codecov if `true`.
  canUploadCoverage: true,

  // * How many days GitHub should keep uploaded artifacts around.
  // ! 90 days is GitHub's default, but this should be dramatically lowered for
  // ! private repos where artifact storage costs $$$.
  artifactRetentionDays: 90
};
