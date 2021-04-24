import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { installDependencies } from '../utils/install';
import { cachePaths } from '../utils/github';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import execa from 'execa';

import type { RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.TestUnit}`);

export default async function (context: RunnerContext, options: InvokerOptions) {
  const { shouldSkipCi, canUploadCoverage, commitSha } = await metadataCollect(context, {
    enableFastSkips: true,
    ...options
  });
  const os = process.env.RUNNER_OS;

  if (!shouldSkipCi) {
    await installDependencies();
    await execa('npm', ['run', 'test-unit'], { stdio: 'inherit' });

    canUploadCoverage &&
      (await cachePaths(['./coverage'], `coverage-${os}-${commitSha}`));
  } else debug(`skipped component action "${ComponentAction.TestUnit}"`);
}
