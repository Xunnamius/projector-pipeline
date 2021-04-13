import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import debugFactory from 'debug';
import core from '@actions/core';

import type { Metadata } from '../../types/global';

const debug = debugFactory(`${pkgName}:set-env-outputs`);

/**
 * Issue set-output and set-env commands, including ensuring DEBUG is set
 * action-wide
 */
export function setupEnv(metadata: Metadata) {
  if (metadata.debugString) {
    debugFactory.enable(metadata.debugString);

    if (debug.enabled) {
      debug(`debug string recognized: ${metadata.debugString}`);
      core.setCommandEcho(true);
      core.exportVariable('DEBUG', metadata.debugString);
    } else {
      throw new ComponentActionError(
        `failed to enable debug mode: namespace "${metadata.debugString}" does not include this script`
      );
    }
  }
}
