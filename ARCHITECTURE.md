# The Projector CL/CI/CD Pipeline

Development in Projector-based repositories adheres to [Trunk Based
Development][1] principles, specifically leveraging _[short-lived feature
branches][25]_ (SLFB) and Continuous Linting (CL), [Continuous Integration][28]
(CI), and [Continuous Deployment][29] (CD). This pipeline was built to
accommodate this flow.

---

- [Structure of Projector-based Projects][4]
- [Workflows And Triggering Events][6]
  - [The `build-test` Workflow][7]
  - [The `deploy` Workflow][8]
  - [The `cleanup` Workflow][9]
  - [The `post-release-check` Workflow][10]
- [Committing Changes][11]
  - [Committing Breaking Changes][12]
  - [Pipeline Commit Message Commands][13]
- [Pushing Commits And Merging PRs][14]
- [Configuring The Pipeline][15]
- [Caveats][16]

---

The pipeline functions in three stages:

- First, the so-called "Continuous Linting" stage is triggered, which
  automatically runs formatting, linting, and unit testing locally on the
  developer's machine before every commit. Commits that fail local tests are
  rejected without triggering the other pipeline stages. This [tightens the
  developer feedback loop][26] and [saves money][27].

- Once one or more commits are pushed to remote, the CI stage is triggered. This
  stage runs project-wide linting, unit, and integration tests. The workflow
  associated with this stage is `build-test`.

- Finally, if the CI stage terminates successfully, the CD stage is triggered.
  It builds, formats, versions, and potentially deploys the software. Production
  releases are handled by a [semantic-release fork][42]. For PRs specifically,
  this stage is where eligible PRs are automatically merged, since PRs can
  _never_ trigger deployments. The workflows associated with this stage are
  `deploy`, `cleanup`, and `post-release-check`.

These stages trigger one after the other such that the CD stage always is
skipped when the CI stage fails a check, and the CL stage will reject local
commits that fail linting or unit testing before they reach the CI stage.

## Structure of Projector-based Projects

For this pipeline to behave as described, a `package.json` file must exist in
the repository root.

Additionally, the repository must have a `main` branch. `main` is the only
branch that must remain permanently; other branches are automatically deleted
after being merged into `main`. For NPM package projects, this also means
`latest` is the only permanent [dist-tag][36].

> The term "merged" as used here and elsewhere in this document connotes a
> [non-ff merge][30] operation. Note that [ff merge][30], [rebase][31], and
> [squash][32] operations can be used as well **except when merging between
> release branches (like `main` and `canary`); [only non-ff merge operations
> should be used to merge between release branches][33]; any other operation
> (_[including force pushing][34]_) risks damaging `semantic-release`'s version
> tracking metadata**!

There are also [maintenance branches][35] and the `canary` branch. These are
semi-permanent branches in that they are never automatically deleted except in
the circumstances described below.

`canary` is a special SLFB used to publish commits on the canary release channel
but before they're merged into `main`. This is useful for packaging multiple
features as a single testable release.

For projects with deploy hooks (e.g. Vercel, web push, etc), `canary` may be
used as a permanent preview branch in addition to the permanent `main` branch.

## Workflows And Triggering Events

The pipeline is triggered by three [GitHub API events][47]:

- `push` events that:
  - Are of non-tag refs (pushed tags are ignored by CI/CD)
  - Are of refs with names not starting with `dependabot/`, `snyk-`, or `no-ci/`
- `pull_request` events that:
  - Are of type `synchronize` or `opened`
  - Compare against branches `main` or `canary`
- `workflow_dispatch` events (manual triggers)

This is further described by the following chart of events:

    push to main ==> run CI ==> run CD ==> release vx.y.z
    push to canary ==> run CI ==> run CD ==> release vx.y.z-canary.N
    push to other SLFB ==> run CI
    PR opened targeting main/canary ==> run CI ==> auto-merge if whitelisted actor
    PR synchronized targeting main/canary ==> run CI ==> auto-merge if whitelisted actor
    PR merged targeting main/canary ==> run CI ==> run CD ==> release vx.y.z

> Pushes to SLFBs starting with `dependabot/`, `snyk-`, or `no-ci/` will never
> trigger the CI stage.

When the pipeline is triggered by one of the above events, the `build-test`
workflow runs first followed by the `deploy` workflow. The `build-test` workflow
is _[unprivileged][5]_, i.e. runs without access to repository secrets and has
read-only tokens. The `deploy` workflow, on the other hand, is [privileged][5].

### The `build-test` Workflow

The `build-test` workflow organizes and builds the source, saving the result as
an artifact; concurrently, linting and testing are run. Unit test coverage
results are saved as an additional artifact that is eventually uploaded to
Codecov during the `deploy` workflow. Any failure at any step will fail the
entire pipeline.

Four suites of integration tests are supported: _node_, _externals_, _client_
(for browsers/cli/etc), and _webpack_. The presence of these test suites is
picked up by `grep`-ing the output of `npm run list-tasks` to search for the
presence of the NPM script keys `test-integration-node`,
`test-integration-externals`, `test-integration-client`, or
`test-integration-webpack` respectively.

The `build-test` workflow also supports an optional documentation build step via
the `build-docs` NPM script key. A warning will be generated for projects that
lack this key. Further, CI will fail if there is a `build-externals` key without
a `test-integration-externals` key or vice-versa.

> Note that internal PRs to `main`/`canary` made from pushing to internal
> branches will trigger two pipeline runs: one on the `push` event generated by
> pushing to said branch and the other on the subsequent `pull_request` event
> when the PR is opened (type: `opened`) or its merge commit is updated (type:
> `synchronize`). If this is a problem (i.e. wasting money), prepend `no-ci/` to
> the internal branch name or transition to a _clone-and-pull_ workflow instead
> of _branch-and-pull_.

### The `deploy` Workflow

The `deploy` workflow uploads coverage data and performs deployments and
auto-merges. Any failure at any step will fail the entire pipeline.

### The `cleanup` Workflow

The `cleanup` workflow deletes distribution channels and performs other cleanup
tasks. It is not triggered directly by the pipeline, but is a cleanup routine
that runs whenever a branch is deleted. Failures in this workflow will not
affect the pipeline.

### The `post-release-check` Workflow

The `post-release-check` workflow checks the installation process and resultant
binaries for general correctness. Failures in this workflow will not affect the
pipeline.

## Committing Changes

Changes can be committed directly to `main`, to a SLFB that is eventually merged
into `main`, or through a PR that is eventually merged into `main`.

To handle automated [CHANGELOG.md][41] generation, `projector-pipeline` expects
all commits to use the [angular-style convention][17], including a soft 100
character limit on the subject and a leading blank before the body and footer
sections of commit messages. The body and footer sections are optional, while
every commit message must always have a subject. The commit types allowed to
appear in the subject are always listed in a project's [`package.json`][18] file
and typically include: `feat`, `fix`, `docs`, `style`, `refactor`, `test`,
`revert`, `debug`, `build`, and `chore`.

> Conventional commits can be made much easier using a tool like
> [git-add-then-commit][19]!

### Committing Breaking Changes

Commits that include `BREAKING:`, `BREAKING CHANGE:`, or `BREAKING CHANGES:` in
their message body will be treated as major release commits and will appear in
[CHANGELOG.md][41] regardless of their type.

For example:

```Bash
git commit -m "debug: this commit will cause a major version bump and
will appear in the changelog, even though it's only a debug commit!!!

BREAKING CHANGE: this feature replaces that feature
BREAKING CHANGE: this other feature now also works differently"
```

### Pipeline Commit Message Commands

There are several commands that can affect the behavior of the pipeline. To use
them, include them as part of the top commit's message when pushing to remote.
When a single push consists of multiple commits, only the very top commit's
message is parsed for commands.

The following commands are recognized:

| Command     | Alias(es)   | Description                                    | Usage Example                                          |
| ----------- | ----------- | ---------------------------------------------- | ------------------------------------------------------ |
| `[skip ci]` | `[ci skip]` | Skip the entire pipeline (implies `[skip cd]`) | `git commit -m 'build: fix CI system [skip ci]'`       |
| `[skip cd]` | `[cd skip]` | Skip only the CD stage                         | `git commit -m 'style: do-not-release-this [skip cd]'` |

## Pushing Commits And Merging PRs

Pushing commits directly to any branch, opening a PR against `main`/`canary`,
synchronizing a PR made against `main`/`canary`, or successfully merging such a
PR will trigger the CI stage.

With direct pushes and merged PRs, if all tests pass and the GitHub user
responsible for triggering the pipeline has the [proper permissions][15], the CD
stage runs where:

- Commits pushed to `main` are released on the [default release channel][2]
- Commits pushed to `canary` are released on the [prerelease channel][39]
- Commits pushed to `N.x`/`N.x.x` and `N.N.x` maintenance branches are released
  on their respective [maintenance channels][35]
- Commits pushed to other release branches will also generate a release
  depending on [custom configuration][40]

Commits involving PRs that haven't already been merged successfully and commits
pushed to non-release branches will never cause a new release to be published,
even if all tests pass and [the pipeline actor and repository owner are both
whitelisted][15]. This is a security measure. However, PRs from whitelisted
users (typically bots) will be automatically merged, or _auto-merged_, into
`main` if all tests pass, which could eventually end up triggering a new release
automatically.

## Configuring The Pipeline

The pipeline recognizes two configurations files:

- **Global default configuration** is downloaded at the start of every
  `projector-pipeline` run _across all projects and repositories_ from the
  following permanent URI:
  [https://github.com/xunnamius/projector-pipeline/blob/main/dist/pipeline.config.js][20]

- **Local configuration** is sourced from `.github/pipeline.config.js`, if it
  exists in the repository. See [this example][21] for more details.

## Caveats

**Using Forked `semantic-release`**

All tags created by this pipeline are annotated and automatically signed. To
support this and other features that require annotated tags, we use a [custom
fork of semantic-release][42]. Hopefully [support for][43] [annotated tags][44]
will be included upstream one day.

**Force Pushing Might Break Everything**

Force pushing to `main` and `canary` will always fail (unless temporarily
allowed). This is [to protect semantic-release's metadata][34], which a force
push will almost certainly corrupt.

**Revert Commits Are Always Released**

[All reverts are treated as patches and immediately released][3] no matter the
type of the reverted commit. This means commits that were reverted will appear
in [CHANGELOG.md][41] even if they didn't trigger an earlier release. This also
means **reverting a commit that introduced a breaking change will only trigger a
patch release** unless the revert commit itself also includes `BREAKING CHANGE:`
in its message body.

If a push includes only revert commits (and `BREAKING CHANGE:` or an alternative
is not present in the top commit's message body), **the result is always a patch
release and a corresponding confusingly-empty (and ugly) entry in
[CHANGELOG.md][41]!**

[1]: https://trunkbaseddevelopment.com
[2]:
  https://semantic-release.gitbook.io/semantic-release/usage/workflow-configuration#release-branches
[3]:
  https://github.com/semantic-release/commit-analyzer/blob/506a9cb46f475905e5457e11c63e14e0f329ce83/lib/default-release-rules.js#L8
[25]: https://trunkbaseddevelopment.com/#scaled-trunk-based-development
[26]:
  https://blog.nelhage.com/post/testing-and-feedback-loops/#invest-in-regression-testing
[27]: https://github.com/pricing
[28]: https://en.wikipedia.org/wiki/Continuous_integration
[29]: https://en.wikipedia.org/wiki/Continuous_deployment
[30]: https://git-scm.com/docs/git-merge#Documentation/git-merge.txt---no-ff
[31]: https://git-scm.com/docs/git-rebase
[32]: https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History#_squashing
[33]:
  https://github.com/semantic-release/git#merging-between-semantic-release-branches
[34]:
  https://semantic-release.gitbook.io/semantic-release/support/troubleshooting#release-not-found-release-branch-after-git-push-force
[35]:
  https://semantic-release.gitbook.io/semantic-release/usage/workflow-configuration#maintenance-branches
[36]: https://docs.npmjs.com/cli/v6/commands/npm-dist-tag#purpose
[39]:
  https://semantic-release.gitbook.io/semantic-release/usage/workflow-configuration#pre-release-branches
[40]: release.config.js
[41]: CHANGELOG.md
[42]: https://github.com/Xunnamius/semantic-release/tree/contrib-holistic
[43]: https://github.com/semantic-release/semantic-release/pull/1709
[44]: https://github.com/semantic-release/semantic-release/pull/1710
[47]:
  https://docs.github.com/en/free-pro-team@latest/actions/reference/events-that-trigger-workflows
[5]: README.md#usage-github-actions
[4]: #structure-of-projector-based-projects
[6]: #workflows-and-triggering-events
[7]: #the-build-test-workflow
[8]: #the-deploy-workflow
[9]: #the-cleanup-workflow
[10]: #the-post-release-check-workflow
[11]: #committing-changes
[12]: #committing-breaking-changes
[13]: #pipeline-commit-message-commands
[14]: #pushing-commits-and-merging-prs
[15]: #configuring-the-pipeline
[16]: #caveats
[17]: https://www.conventionalcommits.org/en/v1.0.0/#summary
[18]: package.json
[19]: https://www.npmjs.com/package/git-add-then-commit
[20]:
  https://github.com/xunnamius/projector-pipeline/blob/main/dist/pipeline.config.js
[21]: .github/pipeline.config.js
