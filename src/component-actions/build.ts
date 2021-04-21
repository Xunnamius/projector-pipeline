import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { installDependencies } from '../utils/install';
import { uncachePaths } from '../utils/github';
import { uploadPaths } from '../utils/github';
import metadataCollect from '../component-actions/metadata-collect';
import debugFactory from 'debug';
import core from '@actions/core';
import execa from 'execa';

import type { RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.Build}`);

export default async function (context: RunnerContext, options: InvokerOptions) {
  const {
    shouldSkipCi,
    commitSha,
    artifactRetentionDays,
    hasDocs
  } = await metadataCollect(context, options);

  if (!shouldSkipCi) {
    const os = process.env.RUNNER_OS;

    await installDependencies();
    await execa('npm', ['run', 'format'], { stdio: 'inherit' });
    await execa('npm', ['run', 'build-dist'], { stdio: 'inherit' });

    hasDocs
      ? await execa('npm', ['run', 'build-docs'], { stdio: 'inherit' })
      : core.warning('no `build-docs` script defined in package.json');

    await execa('npm', ['run', 'format'], { stdio: 'inherit' });
    await uncachePaths(['./coverage'], `coverage-${os}-${commitSha}`);
    await uploadPaths(
      ['./*', '!./**/node_modules', '!.git'],
      `build-${os}-${commitSha}`,
      artifactRetentionDays
    );
  } else debug(`skipped component action "${ComponentAction.Build}"`);
}
