import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { installDependencies } from '../utils/install-deps';
import { cachePaths } from '../utils/actions-cache';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import core from '@actions/core';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:${ComponentAction.TestUnit}`);

export default async function () {
  const metadata = await metadataCollect();

  if (!metadata.shouldSkipCi) {
    await installDependencies();
    await execa('npm', ['run', 'test-unit'], { stdio: 'inherit' });

    metadata.canUploadCoverage
      ? await cachePaths(
          ['./coverage'],
          `coverage-${process.env.RUNNER_OS}-${metadata.commitSha}`
        )
      : core.warning('no code coverage data will be collected for this run');
  } else debug(`skipped component action "${ComponentAction.TestUnit}"`);
}
