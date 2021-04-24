import { name as pkgName } from '../package.json';
import { ComponentAction } from '../types/global';
import { context } from '@actions/github';
import debugFactory from 'debug';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:${ComponentAction.VerifyNpm}`);

void context, execa, debug;

// TODO: determine matrices
// TODO: add all secrets to core.setSecret
// TODO: accept additional option for warning if pipeline is in debug mode (process.env.DEBUG or debug string)
// try {
//   // TODO
// } catch (e) {
//   debug(`caught error during "${action}": %O`, e);
//   const msg = e ? `: ${e.message || e}` : '';
//   core.setFailed(`${action} component action invocation failed${msg}`);
// }
