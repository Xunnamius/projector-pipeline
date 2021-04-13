import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { installDependencies } from '../utils/install-deps';
import { uncachePaths } from '../utils/actions-cache';
import { uploadPaths } from '../utils/actions-artifact';
import metadataCollect from '../component-actions/metadata-collect';
import debugFactory from 'debug';
import core from '@actions/core';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:${ComponentAction.Build}`);

export default async function () {
  const metadata = await metadataCollect();

  if (!metadata.shouldSkipCi) {
    await installDependencies();
    await execa('npm', ['run', 'format'], { stdio: 'inherit' });
    await execa('npm', ['run', 'build-dist'], { stdio: 'inherit' });

    metadata.hasDocs
      ? await execa('npm', ['run', 'build-docs'], { stdio: 'inherit' })
      : core.warning('no `build-docs` script defined in package.json');

    await execa('npm', ['run', 'format'], { stdio: 'inherit' });
    await uncachePaths(
      ['./coverage'],
      `coverage-${process.env.RUNNER_OS}-${metadata.commitSha}`
    );
    await uploadPaths(
      ['./*', '!./**/node_modules', '!.git'],
      `build-${process.env.RUNNER_OS}-${metadata.commitSha}`,
      metadata.artifactRetentionDays
    );
  } else debug(`skipped component action "${ComponentAction.Build}"`);
}
