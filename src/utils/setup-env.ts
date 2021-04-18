import { name as pkgName } from '../../package.json';
import debugFactory from 'debug';
import core from '@actions/core';

import type { Metadata } from '../../types/global';

const debug = debugFactory(`${pkgName}:set-env-outputs`);

/**
 * Issue set-output and set-env commands, including ensuring DEBUG is set
 * action-wide
 */
export function setupEnv({ debugString, packageName }: Metadata) {
  if (debugString) {
    debugFactory.enable(
      typeof debugString == 'boolean' ? `${packageName}:*` : debugString
    );

    if (debug.enabled) {
      debug(`pipeline debug string recognized: ${debugString}`);
      core.setCommandEcho(true);
      core.exportVariable('DEBUG', debugString);
    } else {
      core.warning(
        `debug string "${debugString}" is narrow; not all debug output will be visible`
      );
    }
  }
}
