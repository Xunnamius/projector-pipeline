import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { installDependencies } from '../utils/install';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import execa from 'execa';

import type { RunnerContext, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.VerifyNpm}`);

export default async function (context: RunnerContext, options: InvokerOptions) {
  const { shouldSkipCi, shouldSkipCd } = await metadataCollect(context, options);

  if (!shouldSkipCi && !shouldSkipCd) {
    // TODO: exponential back-off attempts to npm install for a maximum of 5 minutes before giving up
    // TODO: test install package
    // TODO: if bin, npx them and look for 1) 0 exit code or 2) 1 exit code and a stderr starting with "fatal:"
  } else debug(`skipped component action "${ComponentAction.VerifyNpm}"`);
}
