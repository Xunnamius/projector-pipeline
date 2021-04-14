import { ComponentActionError } from './error';
import { name as pkgName } from '../package.json';
import { ComponentAction } from '../types/global';
import debugFactory from 'debug';
import cloneDeep from 'clone-deep';

import type {
  InvokerOptions,
  InvokerResult,
  ImportedComponentAction
} from '../types/global';

export { ComponentAction };

const debug = debugFactory(`${pkgName}:index`);

export const PRIVILEGED_DEPS_URI =
  'https://github.com/xunnamius/projector-pipeline/raw/main/dist/privileged/package.json';
export const GLOBAL_PIPELINE_CONFIG_URI =
  'https://github.com/xunnamius/projector-pipeline/raw/main/dist/pipeline.config.js';
export const UPLOADED_METADATA_TMPDIR = '/tmp/uploaded.meta.json';
export const GLOBAL_METADATA_TMPDIR = '/tmp/global.meta.json';

// TODO: leave if-debug warning in workflow files (move under metadata-*)

/**
 * Invokes the specified component `action` with `options`, if given. Throws on
 * error, otherwise returns an InvokerResult object.
 */
export async function invokeComponentAction(
  action: ComponentAction,
  options: InvokerOptions = {}
): Promise<InvokerResult> {
  options = cloneDeep(options);
  let outputs: InvokerResult['outputs'] = {};

  debug(
    'all available component actions: %O',
    Object.keys(ComponentAction).filter((k) => Number.isNaN(k))
  );

  try {
    debug(`invoking component action "${action}" with initial options: %O`, options);
    outputs =
      (await ((await import(
        `${__dirname}/../src/component-actions/${action}`
      )) as ImportedComponentAction).default(options)) || {};
  } catch (e) {
    debug('final options used: %O', options);
    debug(`caught error during "${action}": %O`, e);
    const msg = e ? `: ${e.message || e}` : '';
    throw new ComponentActionError(`${action} component action invocation failed${msg}`);
  }

  debug('final options used: %O', options);

  return {
    action,
    options,
    outputs
  };
}
