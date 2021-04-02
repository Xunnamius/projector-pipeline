<!-- prettier-ignore-start -->

<!-- badges-start -->

[![Black Lives Matter!][badge-blm]][link-blm]
[![Maintenance status][badge-maintenance]][link-repo]
[![Last commit timestamp][badge-last-commit]][link-repo]
[![Open issues][badge-issues]][link-issues]
[![Pull requests][badge-pulls]][link-pulls]
[![codecov][badge-codecov]][link-codecov]
[![Source license][badge-license]][link-license]
[![NPM version][badge-npm]][link-npm]
[![semantic-release][badge-semantic-release]][link-semantic-release]

<!-- badges-end -->

<!-- prettier-ignore-end -->

# projector-pipeline

This project contains the collection of component actions that power the CI/CD
pipeline that undergirds [Projector][2]-based projects. For more details on the
pipeline's design, such as managing per-repository and cross-repository pipeline
configurations, see [ARCHITECTURE.md][architecture].

---

- [Usage: GitHub Actions][3]
  - [Audit Project][4]
  - [Build Distributables][5]
  - [Post-delete Cleanup][6]
  - [Lint Source][7]
  - [Collect Metadata][8]
  - [Download Metadata][9]
  - [Release/Auto-merge][10]
  - [Client Integration Tests][11]
  - [Externals Integration Tests][12]
  - [Node Integration Tests][13]
  - [Webpack Integration Tests][14]
  - [Unit Tests][15]
  - [Post-release Installation Verification][16]
- [Usage: NPM][17]
  - [Install][18]
  - [Example][19]
  - [Documentation][20]
- [Contributing and Support][21]

---

The following component actions can be imported as libraries via Node or invoked
directly in your workflows:

**`audit`**\
_Unprivileged_. Audits a project for security vulnerabilities. Currently, all auditing
is handled by `npm audit`.

**`build`**\
_Unprivileged_. Builds a project's distributables via `npm run build`. Currently
all auditing is handled by `npm audit`. This component action expects coverage data
to be available in the cache at runtime. Hence, this component action must always
run _after_ `test-unit`.

**`cleanup-npm`**\
_Privileged_. Cleans up package metadata (e.g. pruning unused dist-tags) after branch
deletion.

**`lint`**\
_Unprivileged_. Lints project source via `npm run lint`.

**`metadata-collect`**\
_Unprivileged_. Collects metadata from the environment and uploads it as an artifact.
Must run only in unprivileged contexts.

**`metadata-download`**\
_Unprivileged_. Downloads metadata artifacts created by `metadata-collect`. Can be
used in both privileged and unprivileged workflows.

**`release-automerge`**\
_Privileged_. Builds changelog (via `npm run build-changelog`) and runs semantic-release,
potentially resulting in a new software version being released. If the pipeline was
triggered by a PR, semantic-release will never run. Instead, the PR will be auto-merged
if eligible (see `metadata-collect`).

**`test-integration-client`**\
_Unprivileged_. Runs all bespoke integration tests via `npm run test-integration-client`.

**`test-integration-externals`**\
_Unprivileged_. Runs all integration tests specific to project externals via `npm run test-integration-externals`.

**`test-integration-node`**\
_Unprivileged_. Runs all Node-specific integration tests via `npm run test-integration-node`.

**`test-integration-webpack`**\
_Unprivileged_. Runs all Webpack-specific integration tests via `npm run test-integration-webpack`.

**`test-unit`**\
_Unprivileged_. Runs all unit tests via `npm run test-unit` and caches coverage data
for use by `build`. Hence, this component action must always run _before_ `build`.

**`verify-npm`**\
_Privileged_. Performs post-release package verification, e.g. ensure `npm install`
and related scripts function without errors. This action is best invoked several
minutes _after_ a release has occurred so that release channels have a chance to
update their caches.

## Usage: GitHub Actions

Each component action is directly invocable through a unified Actions interface.

Component actions are either _privileged_, where they require repository secrets
and GitHub write tokens (e.g. `workflow_run`), or _unprivileged_, where they
**must not** have access to secrets or write tokens (e.g. `pull_request`). **It
is a major security vulnerability to invoke unprivileged component actions on
[untrusted code outside properly sandboxed workflows][22].**

### Audit Project

> **UNPRIVILEGED ACTION**

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: audit
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Build Distributables

> _PRIVILEGED ACTION_

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: build
  options: >
    {
      "": "",
      "": ""
    }
```

#### Options

This action accepts an `options` JSON string input with the following properties
and constraints:

| Name     | Type     | Default | Description                                                                                                                                                                  |
| :------- | :------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `todo-a` | _string_ |         | **[REQUIRED]** Long description text goes here and it is long it could be several sentences actually and it should still look pretty good in the resulting markdown document |
| `todo-b` | _number_ |         | Long description text goes here and it is long it could be several sentences actually and it should still look pretty good in the resulting markdown document                |

#### Outputs

| Name     | Type     | Description                                                                                                                                                   |
| :------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `todo-a` | _string_ | Long description text goes here and it is long it could be several sentences actually and it should still look pretty good in the resulting markdown document |
| `todo-b` | _number_ | Long description text goes here and it is long it could be several sentences actually and it should still look pretty good in the resulting markdown document |

### Post-delete Cleanup

> _PRIVILEGED ACTION_

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: cleanup-npm
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Lint Source

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: lint
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Collect Metadata

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: collect-metadata
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Download Metadata

> UNPRIVILEGED ACTION (but can be run in privileged workflows safely)

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: download-metadata
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Release/Auto-merge

> _PRIVILEGED ACTION_

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: release-automerge
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Client Integration Tests

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-client
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Externals Integration Tests

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-externals
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Node Integration Tests

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-node
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Webpack Integration Tests

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-webpack
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Unit Tests

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-unit
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### Post-release Installation Verification

> **UNPRIVILEGED ACTION**

This component action caches xyz, artifact rst

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: verify-npm
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

## Usage: NPM

Each component action can also be imported and run locally via unified NPM
package.

### Install

> Note: NPM versions >=7 may need `npm install --legacy-peer-deps` until
> [upstream peer dependency problems are resolved][1].

```shell
npm install @xunnamius/projector-pipeline
```

<details><summary><strong>[additional details]</strong></summary>

> Note: **you probably don't need to read through this!** This information is
> primarily useful for those attempting to bundle this package or for people who
> have an opinion on ESM versus CJS.

This is a [dual CJS2/ES module][dual-module] package. That means this package
exposes both CJS2 and ESM entry points.

Loading this package via `require(...)` will cause Node and Webpack to use the
[CJS2 bundle][cjs2] entry point, disable [tree shaking][tree-shaking] in Webpack
4, and lead to larger bundles in Webpack 5. Alternatively, loading this package
via `import { ... } from ...` or `import(...)` will cause Node to use the ESM
entry point in [versions that support it][node-esm-support], as will Webpack.
Using the `import` syntax is the modern, preferred choice.

For backwards compatibility with Webpack 4 and Node versions < 14,
[`package.json`][package-json] retains the [`module`][module-key] key, which
points to the ESM entry point, and the [`main`][exports-main-key] key, which
points to the CJS2 entry point explicitly (using the .js file extension). For
Webpack 5 and Node versions >= 14, [`package.json`][package-json] includes the
[`exports`][exports-main-key] key, which points to both entry points explicitly.

Though [`package.json`][package-json] includes
[`{ "type": "commonjs"}`][local-pkg], note that the ESM entry points are ES
module (`.mjs`) files. [`package.json`][package-json] also includes the
[`sideEffects`][side-effects-key] key, which is `false` for [optimal tree
shaking][tree-shaking], and the `types` key, which points to a TypeScript
declarations file.

Additionally, this package does not maintain shared state and so does not
exhibit the [dual package hazard][hazard]. However, setting global configuration
may not actually be "globally" recognized by third-party code importing this
package.

</details>

### Example

```typescript
import { invokeAction } from '@xunnamius/projector-pipeline';

const result = await invokeAction('audit');
```

## Documentation

Further documentation for using the NPM package can be found under
[`docs/`][docs]. See [ARCHITECTURE.md][architecture] and
[CONTRIBUTING.md][contributing] for more details on the pipeline.

## Contributing and Support

**[New issues][choose-new-issue] and [pull requests][pr-compare] are always
welcome and greatly appreciated! 🤩** Just as well, you can star 🌟 this project
to let me know you found it useful! ✊🏿 Thank you!

See [CONTRIBUTING.md][contributing] and [SUPPORT.md][support] for more
information.

[badge-blm]: https://api.ergodark.com/badges/blm 'Join the movement!'
[link-blm]: https://secure.actblue.com/donate/ms_blm_homepage_2019
[badge-maintenance]:
  https://img.shields.io/maintenance/active/2021
  'Is this package maintained?'
[link-repo]: https://github.com/xunnamius/projector-pipeline
[badge-last-commit]:
  https://img.shields.io/github/last-commit/xunnamius/projector-pipeline
  'When was the last commit to the official repo?'
[badge-issues]:
  https://isitmaintained.com/badge/open/Xunnamius/projector-pipeline.svg
  'Number of known issues with this package'
[link-issues]: https://github.com/Xunnamius/projector-pipeline/issues?q=
[badge-pulls]:
  https://img.shields.io/github/issues-pr/xunnamius/projector-pipeline
  'Number of open pull requests'
[link-pulls]: https://github.com/xunnamius/projector-pipeline/pulls
[badge-codecov]:
  https://codecov.io/gh/Xunnamius/projector-pipeline/branch/main/graph/badge.svg?token=HWRIOBAAPW
  'Is this package well-tested?'
[link-codecov]: https://codecov.io/gh/Xunnamius/projector-pipeline
[badge-license]:
  https://img.shields.io/npm/l/@xunnamius/projector-pipeline
  "This package's source license"
[link-license]:
  https://github.com/Xunnamius/projector-pipeline/blob/main/LICENSE
[badge-npm]:
  https://api.ergodark.com/badges/npm-pkg-version/@xunnamius/projector-pipeline
  'Install this package using npm or yarn!'
[link-npm]: https://www.npmjs.com/package/@xunnamius/projector-pipeline
[badge-semantic-release]:
  https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
  'This repo practices continuous integration and deployment!'
[link-semantic-release]: https://github.com/semantic-release/semantic-release
[package-json]: package.json
[docs]: docs
[choose-new-issue]:
  https://github.com/Xunnamius/projector-pipeline/issues/new/choose
[pr-compare]: https://github.com/Xunnamius/projector-pipeline/compare
[contributing]: CONTRIBUTING.md
[architecture]: ARCHITECTURE.md
[support]: .github/SUPPORT.md
[cjs2]: https://webpack.js.org/configuration/output/#module-definition-systems
[dual-module]:
  https://github.com/nodejs/node/blob/8d8e06a345043bec787e904edc9a2f5c5e9c275f/doc/api/packages.md#dual-commonjses-module-packages
[exports-main-key]:
  https://github.com/nodejs/node/blob/8d8e06a345043bec787e904edc9a2f5c5e9c275f/doc/api/packages.md#package-entry-points
[hazard]:
  https://github.com/nodejs/node/blob/8d8e06a345043bec787e904edc9a2f5c5e9c275f/doc/api/packages.md#dual-package-hazard
[local-pkg]:
  https://github.com/nodejs/node/blob/8d8e06a345043bec787e904edc9a2f5c5e9c275f/doc/api/packages.md#type
[module-key]: https://webpack.js.org/guides/author-libraries/#final-steps
[node-esm-support]:
  https://medium.com/%40nodejs/node-js-version-14-available-now-8170d384567e#2368
[side-effects-key]:
  https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free
[tree-shaking]: https://webpack.js.org/guides/tree-shaking
[1]:
  https://github.blog/2020-10-13-presenting-v7-0-0-of-the-npm-cli/#user-content-breaking-changes
[2]: https://github.com/Xunnamius/projector
[3]: #usage-github-actions
[4]: #audit-project
[5]: #build-distributables
[6]: #post-delete-cleanup
[7]: #lint-source
[8]: #collect-metadata
[9]: #download-metadata
[10]: #releaseauto-merge
[11]: #client-integration-tests
[12]: #externals-integration-tests
[13]: #node-integration-tests
[14]: #webpack-integration-tests
[15]: #unit-tests
[16]: #post-release-installation-verification
[17]: #usage-npm
[18]: #install
[19]: #example
[20]: #documentation
[21]: #contributing-and-support
[22]:
  https://securitylab.github.com/research/github-actions-preventing-pwn-requests
