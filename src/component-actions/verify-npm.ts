import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { installDependencies } from '../utils/install-deps';
import metadataCollect from './metadata-collect';
import debugFactory from 'debug';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:${ComponentAction.VerifyNpm}`);

export default async function () {
  const metadata = await metadataCollect();

  if (!metadata.shouldSkipCi) {
    // TODO: exponential back-off attempts to npm install for a maximum of 5 minutes before giving up
    // TODO: test install package
    // TODO: if bin, npx them and look for 1) 0 exit code or 2) 1 exit code and a stderr starting with "fatal:"
    void installDependencies, execa;
  } else debug(`skipped component action "${ComponentAction.VerifyNpm}"`);
}
