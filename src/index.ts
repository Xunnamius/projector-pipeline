import { ComponentActionError } from './error';
import { name as pkgName } from '../package.json';
import { ComponentAction, RunnerContext } from '../types/global';
import debugFactory from 'debug';
import cloneDeep from 'clone-deep';
import os from 'os';

import type {
  InvokerOptions,
  InvokerResult,
  ComponentActionModule
} from '../types/global';

export { ComponentAction };

const debug = debugFactory(`${pkgName}:index`);
const availableComponentActions = Object.keys(ComponentAction).filter(
  // ? Returns false if the non-whitespace string can be parsed as a number
  (k) => isNaN((k as unknown) as number)
);

export const PRIVILEGED_DEPS_URI =
  'https://github.com/xunnamius/projector-pipeline/raw/main/dist/privileged/package.json';
export const GLOBAL_PIPELINE_CONFIG_URI =
  'https://github.com/xunnamius/projector-pipeline/raw/main/dist/pipeline.config.js';
export const UPLOADED_METADATA_PATH = `${os.tmpdir()}/uploaded.meta.json`;
export const GIT_MIN_VERSION = '2.18';

/**
 * Invokes the specified component `action` with `options`, if given. Throws on
 * error, otherwise returns an InvokerResult object.
 */
export async function invokeComponentAction(
  action: ComponentAction,
  context: RunnerContext,
  options: InvokerOptions = {}
): Promise<InvokerResult> {
  options = cloneDeep(options);
  let outputs: InvokerResult['outputs'] = {};

  debug('all available component actions: %O', availableComponentActions);

  try {
    debug(`invoking component action "${action}" with initial options: %O`, options);
    outputs =
      (await ((await import(
        `${__dirname}/../src/component-actions/${action}`
      )) as ComponentActionModule).default(context, options)) || {};
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
