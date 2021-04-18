import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { ComponentActionError } from '../error';
import { writeFileSync } from 'fs';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import core from '@actions/core';
import execa from 'execa';
import match from 'micromatch';

import type { InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.CleanupNpm}`);

export default async function ({ npmToken }: InvokerOptions = {}) {
  if (!npmToken) {
    throw new ComponentActionError('missing required option `npmToken`');
  } else core.setSecret(npmToken);

  const { shouldSkipCi, releaseBranchConfig } = await metadataCollect();

  if (!shouldSkipCi) {
    await execa('git', ['remote', 'prune', 'origin'], { stdio: 'inherit' });
    const { stdout: branchesString } = await execa('git', [
      'for-each-ref',
      `--format='%(refname:lstrip=3)'`,
      'refs/remotes/origin'
    ]);

    debug(`branchesString: ${branchesString}`);

    const repoBranches = branchesString.split('\n');
    let distTags: string[];

    debug(`saw repo branches: ${repoBranches}`);
    debug(`saw package name: ${pkgName}`);

    try {
      const { stdout: distTagsString } = await execa('npm', [
        'dist-tag',
        'list',
        pkgName
      ]);

      debug(`distTagsString: ${distTagsString}`);
      distTags = distTagsString.split('\n').map((t) => t.split(':')[0]);
    } catch (ignore) {
      distTags = [];
    }

    debug(`saw current dist tags: ${distTags}`);
    debug(`saw local release branch config: ${releaseBranchConfig}`);

    const releaseBranches = match(
      repoBranches,
      releaseBranchConfig.map((branch) =>
        typeof branch == 'string' ? branch : branch.name
      )
    );

    debug(`release branches: ${releaseBranches}`);

    const releaseBranchDistTags = releaseBranchConfig
      .map((branch) => (typeof branch != 'string' ? branch.channel : null))
      .filter(Boolean);

    debug(`release branch dist tags: ${releaseBranchDistTags}`);

    const matchedTags = distTags.filter(
      (tag) =>
        !releaseBranchDistTags.includes(tag) &&
        releaseBranches.every((branch) => tag != branch && tag != `release-${branch}`)
    );

    debug(`dist tags scheduled for deletion: ${matchedTags}`);

    if (matchedTags.length) {
      try {
        writeFileSync('~/.npmrc', `//registry.npmjs.org/:_authToken=${npmToken}`);
        await Promise.all(
          matchedTags.map((tag) => execa('npm', ['dist-tag', 'rm', pkgName, tag]))
        );
      } catch (e) {
        throw new ComponentActionError(
          `some outdated dist tags may not have been deleted (${e})`
        );
      }
    } else debug('dist tags OK!');
  } else debug(`skipped component action "${ComponentAction.CleanupNpm}"`);
}
