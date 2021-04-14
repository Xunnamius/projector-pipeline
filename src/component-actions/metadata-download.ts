import { name as pkgName } from '../../package.json';
import { ComponentAction } from '../../types/global';
import { ComponentActionError } from '../error';
import { setupEnv } from '../utils/setup-env';
import debugFactory from 'debug';
import core from '@actions/core';

import type { Metadata, InvokerOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:${ComponentAction.MetadataDownload}`);

export default async function (options: InvokerOptions = {}): Promise<Metadata> {
  if (!options.githubToken) {
    throw new ComponentActionError('missing required option `githubToken`');
  } else core.setSecret(options.githubToken);

  options.reissueWarnings = !!options.reissueWarnings;

  void debug;

  // TODO: download metadata artifact
  const metadata = {
    // TODO
  } as Metadata;

  setupEnv(metadata); // TODO: do this early along w/ metadata resolution
  // TODO: reissue warnings if necessary

  return metadata;
}
