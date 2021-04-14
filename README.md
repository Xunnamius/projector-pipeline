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

This project contains the collection of component actions powering the CI/CD
pipeline that undergirds [Projector][2]-based projects. For more details on the
pipeline's design, such as managing per-repository and cross-repository pipeline
configurations, see [ARCHITECTURE.md][architecture].

---

- [Usage: GitHub Actions][3]
  - [`audit`][27]
  - [`build`][28]
  - [`cleanup-npm`][29]
  - [`lint`][30]
  - [`metadata-collect`][31]
  - [`metadata-download`][32]
  - [`smart-deploy`][33]
  - [`test-integration-client`][34]
  - [`test-integration-externals`][35]
  - [`test-integration-node`][36]
  - [`test-integration-webpack`][37]
  - [`test-unit`][38]
  - [`verify-npm`][39]
- [Usage: NPM Package][40]
  - [Install][18]
  - [Example][19]
- [Documentation][20]
- [Contributing and Support][21]

---

The following component actions can be imported as libraries via Node or invoked
directly in your workflows:

**[`audit`][27]**\
[_Unprivileged_][3]. Audits a project for security vulnerabilities. Currently, all
auditing is handled by `npm audit`.

**[`build`][28]**\
[_Unprivileged_][3]. Builds a project's distributables via `npm run build` and uploads
them as an artifact for use by `smart-deploy`. This component action expects coverage
data to be available in the cache at runtime. Hence, this component action must always
run _after_ `test-unit`.

**[`cleanup-npm`][29]**\
[_Privileged_][3]. Cleans up package metadata (e.g. pruning unused dist-tags) after
branch deletion.

**[`lint`][30]**\
[_Unprivileged_][3]. Lints project source via `npm run lint`.

**[`metadata-collect`][31]**\
[_Unprivileged_][3]. Checks out the repository using [`@actions/checkout`][41], installs
Node using [`@actions/setup-node`][42], performs initial configurations, collects
metadata, and uploads it as an artifact for use by various other component actions.
Must run only in unprivileged contexts.

It is usually not necessary to invoke this component action manually in
workflows that invoke other component actions; this is because the other actions
invoke this action internally. However, it _is_ necessary to invoke this action
manually when you expect to trigger a workflow that invokes the
`metadata-download` component action.

When invoked internally by another component action, any options passed to the
invoking action will also be recognized by this action, even if the invoking
action doesn't recognize any options by itself.

**[`metadata-download`][32]**\
[_Unprivileged_][3]. Downloads metadata artifact created by `metadata-collect`, checks
out the repository using [`@actions/checkout`][41] (optionally with the working tree
deleted), installs Node using [`@actions/setup-node`][42], and performs initial configurations.
**Can be used in both privileged and unprivileged workflows.**

It is usually not necessary to invoke this component action manually in
workflows that invoke other component actions; this is because the other actions
invoke this action internally. When invoked internally by another component
action, any options passed to the invoking action will also be recognized by
this action, even if the invoking action doesn't recognize any options by
itself.

**[`smart-deploy`][33]**\
[_Privileged_][3]. Uploads code coverage data if available, verifies actor permissions,
and checks for projector template updates. Uses `metadata-download` under the hood.

If an update is available, a new PR will be generated. If the pipeline was
triggered by a PR event, an attempt will be made to auto-merge that PR before
generating and submitting the new PR. Regardless, the current pipeline run will
be aborted and a superseding pipeline run will be triggered by the new PR.

Otherwise if no update is available, and the pipeline was not triggered by a PR
event, semantic-release and related scripts are executed next, potentially
resulting in package releases and/or software deployments. If instead the
pipeline was triggered by a PR event, the PR will be auto-merged if eligible
(see `metadata-collect`). Certain failing merges will be automatically
re-attempted using configurable exponential back-off.

**[`test-integration-client`][34]**\
[_Unprivileged_][3]. Runs all bespoke integration tests via `npm run test-integration-client`.

**[`test-integration-externals`][35]**\
[_Unprivileged_][3]. Runs all integration tests specific to project externals via
`npm run test-integration-externals`.

**[`test-integration-node`][36]**\
[_Unprivileged_][3]. Runs all Node-specific integration tests via `npm run test-integration-node`.

**[`test-integration-webpack`][37]**\
[_Unprivileged_][3]. Runs all Webpack-specific integration tests via `npm run test-integration-webpack`.

**[`test-unit`][38]**\
[_Unprivileged_][3]. Runs all unit tests via `npm run test-unit` and caches coverage
data for use by `build`. Hence, this component action must always run _before_ `build`.

**[`verify-npm`][39]**\
[_Privileged_][3]. Performs post-release package verification, e.g. ensure `npm install`
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

### `audit`

> **UNPRIVILEGED ACTION**

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: audit
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `build`

> _PRIVILEGED ACTION_

This component action uses cached `~/npm` and `./coverage` data if available and
uploads the working tree as an artifact.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: build
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `cleanup-npm`

> _PRIVILEGED ACTION_

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: cleanup-npm
  options: >
    {
      "npm-token": "your-npm-token-here"
    }
```

#### Options

This action accepts an `options` JSON string input with the following properties
and constraints:

| Name        | Type       | Default | Description                                                                              |
| :---------- | :--------- | :------ | :--------------------------------------------------------------------------------------- |
| `npm-token` | _`string`_ | (none)  | **[REQUIRED]** An NPM access token with read-write access to the appropriate package(s). |

See also: [configuring the pipeline][23].

#### Outputs

This component action has no outputs.

### `lint`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: lint
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `metadata-collect`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available and uploads the
collected metadata as an artifact.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: metadata-collect
  options: >
    {
      "github-token": "your-github-pat-here",
      "upload-artifact": true,
      "checkout": {
        "persistCredentials": true
      },
      "setupNode": false
    }
```

#### Options

This action accepts an `options` JSON string input with the following properties
and constraints:

| Name              | Type                                      | Default | Description                                                                                                                                                                                                                                                |
| :---------------- | :---------------------------------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-token`    | _`string`_                                | (none)  | **[REQUIRED]** A GitHub access token with read access to the appropriate repository or repositories. `${{ github.token }}` is usually the right value for this option.                                                                                     |
| `upload-artifact` | _`boolean`_                               | `false` | If `true`, a metadata artifact will be uploaded. This artifact can then be downloaded in the GitHub Actions UI or used by the `metadata-collect` component action.                                                                                         |
| `checkout`        | _`boolean \| Partial<CheckoutSettings>`_  | `true`  | If _truthy_, `@actions/checkout` is triggered. If `checkout` is a [`CheckoutSettings`-like object][43], it is passed to `@actions/checkout` as configuration. Otherwise, [sensible defaults][43] are used. See also: [configuring the pipeline][23].       |
| `setupNode`       | _`boolean \| Partial<SetupNodeSettings>`_ | `true`  | If _truthy_, `@actions/setup-node` is triggered. If `setupNode` is a [`SetupNodeSettings`-like object][43], it is passed to `@actions/setup-node` as configuration. Otherwise, [sensible defaults][43] are used. See also: [configuring the pipeline][23]. |

See also: [configuring the pipeline][23].

#### Outputs

See [action.yml][24] for possible outputs of this component action.

### `metadata-download`

> UNPRIVILEGED ACTION (but can be run in privileged workflows safely)

This component action uses cached `~/npm` data if available and can download
collected metadata artifacts.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: metadata-download
  options: >
    {
      "github-token": "your-github-pat-here"
    }
```

#### Options

This action accepts an `options` JSON string input with the following properties
and constraints:

| Name           | Type       | Default | Description                                                                                                                                                                      |
| :------------- | :--------- | :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `github-token` | _`string`_ | (none)  | **[REQUIRED]** A GitHub access token with read-write access to the appropriate repository or repositories. `${{ secrets.GH_TOKEN }}` is usually the right value for this option. |

See also: [configuring the pipeline][23].

#### Outputs

See [action.yml][24] for possible outputs of this component action.

### `smart-deploy`

> _PRIVILEGED ACTION_

This component action uses cached `~/npm` data if available and requires both
metadata and build artifacts to be available, the former uploaded by
`metadata-collect` and the latter by `build`.

This component action also downloads a [remote `package.json` file][25] during
operation. This file is used to safely install NPM dependencies in privileged
environments. The permanent URI for this download is:
[https://github.com/xunnamius/projector-pipeline/raw/main/dist/privileged/package.json][26]

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: smart-deploy
  options: >
    {
      "github-token": "your-github-pat-here",
      "npm-token": "your-npm-token-here",
      "gpg-priv-key": "your-private-key-here",
      "gpg-passphrase": "your-passphrase-here"
    }
```

#### Options

This action accepts an `options` JSON string input with the following properties
and constraints:

| Name             | Type       | Default | Description                                                                                                            |
| :--------------- | :--------- | :------ | :--------------------------------------------------------------------------------------------------------------------- |
| `github-token`   | _`string`_ | (none)  | **[REQUIRED]** A GitHub access token with read-write access to the appropriate repository or repositories.             |
| `npm-token`      | _`string`_ | (none)  | **[REQUIRED]** An NPM access token with read-write access to the appropriate package(s).                               |
| `codecov-token`  | _`string`_ | (none)  | A Codecov token corresponding to the target repository. Not necessary and should be omitted for public repositories.   |
| `gpg-priv-key`   | _`string`_ | (none)  | **[REQUIRED]** The GPG private key used for git signing purposes. This key must correspond to [`committer.email`][23]. |
| `gpg-passphrase` | _`string`_ | (none)  | **[REQUIRED]** The passphrase that unlocks `gpg-priv-key`.                                                             |

See also: [configuring the pipeline][23].

#### Outputs

This component action has no outputs.

### `test-integration-client`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-client
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `test-integration-externals`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-externals
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `test-integration-node`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-node
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `test-integration-webpack`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-integration-webpack
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `test-unit`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: test-unit
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

### `verify-npm`

> **UNPRIVILEGED ACTION**

This component action uses cached `~/npm` data if available.

Example:

```YML
uses: xunnamius/projector-pipeline@v1.0.0
with:
  action: verify-npm
```

#### Options

This component action does not recognize any options.

#### Outputs

This component action has no outputs.

## Usage: NPM Package

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

For backwards compatibility with Webpack 4 (_compat with Webpack 4 is not
guaranteed!_) and Node versions < 14, [`package.json`][package-json] retains the
[`module`][module-key] key, which points to the ESM entry point, and the
[`main`][exports-main-key] key, which points to the CJS2 entry point explicitly
(using the .js file extension). For Webpack 5 and Node versions >= 14,
[`package.json`][package-json] includes the [`exports`][exports-main-key] key,
which points to both entry points explicitly.

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
import { invokeComponentAction } from '@xunnamius/projector-pipeline';

const result = await invokeComponentAction('metadata-collect', {
  githubToken: 'my-github-pat',
  uploadArtifact: true
});

console.log(result.outputs['should-skip-ci']); // Prints a boolean
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
[18]: #install
[19]: #example
[20]: #documentation
[21]: #contributing-and-support
[22]:
  https://securitylab.github.com/research/github-actions-preventing-pwn-requests
[23]: ARCHITECTURE.md#configuring-the-pipeline
[24]: action.yml
[25]: dist/privileged/package.json
[26]:
  https://github.com/xunnamius/projector-pipeline/blob/main/dist/privileged/package.json
[27]: #audit
[28]: #build
[29]: #cleanup-npm
[30]: #lint
[31]: #metadata-collect
[32]: #metadata-download
[33]: #smart-deploy
[34]: #test-integration-client
[35]: #test-integration-externals
[36]: #test-integration-node
[37]: #test-integration-webpack
[38]: #test-unit
[39]: #verify-npm
[40]: #usage-npm-package
[41]: https://github.com/actions/checkout
[42]: https://github.com/actions/setup-node
[43]: https://github.com/Xunnamius/projector-pipeline/blob/main/types/global.ts
