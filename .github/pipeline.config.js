/**
 * This object is used to configure the GitHub Actions that comprise the
 * build-test-deploy pipeline. Each property is optional.
 */
module.exports = {
  // * The name and email used to author commits and interact with GitHub.
  // ! This should correspond to the identity associated w/ the GH_TOKEN secret.
  // committer: {
  //   name: 'xunn-bot',
  //   email: 'bot@xunn.io'
  // },
  //
  // * Selectively enable debugger verbose output in the pipeline
  // ? see also: https://www.npmjs.com/package/debug#wildcards
  // debugString: '@xunnamius/projector-pipeline:*',
  //
  // * The version of node to load into each job.
  // nodeCurrentVersion: '15.x',
  //
  // * Node versions to test against.
  // nodeTestVersions: ['12.x', '14.x'],
  //
  // * Webpack versions to test against.
  // webpackTestVersions: ['5.x'],
  //
  // * Regular expressions (w/ proper escaping) for skipping CI/CD.
  // ciSkipRegex: /\[skip ci\]|\[ci skip\]/i,
  // cdSkipRegex: /\[skip cd\]|\[cd skip\]/i,
  //
  // * Should auto-merge be retried on failure even when the PR appears
  // * unmergeable?
  // ! WARNING: setting this to true might waste Actions minutes and $$$!
  // canRetryAutomerge: true,
  //
  // * NPM audit will fail upon encountering problems of at least the specified
  // * severity.
  // npmAuditFailLevel: 'high',
  //
  // * Attempt to upload project coverage data to codecov if `true`.
  // canUploadCoverage: true,
  //
  // * How many days GitHub should keep uploaded artifacts around.
  // ! 90 days is GitHub's default, but this should be dramatically lowered for
  // ! private repos where artifact storage costs $$$.
  // artifactRetentionDays: 90
};
