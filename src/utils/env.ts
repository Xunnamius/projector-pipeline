import { name as pkgName } from '../../package.json';
import debugFactory from 'debug';
import core from '@actions/core';

import type { Metadata } from '../../types/global';

const debug = debugFactory(`${pkgName}:env`);

/**
 * Issue set-output and set-env commands, including ensuring DEBUG is set.
 */
export function setupEnv({ debugString }: Metadata) {
  debugString = debugString === true ? '*' : debugString || process.env.DEBUG || null;

  if (debugString) {
    debugFactory.enable(debugString);

    debug(`pipeline debug string recognized: ${debugString}`);
    core.exportVariable('DEBUG', debugString);
    core.setCommandEcho(true);

    if (!debug.enabled) {
      core.warning(
        `debug string "${debugString}" is too narrow; some debug output will remain hidden`
      );
    }
  }
}
