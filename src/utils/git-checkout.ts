import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import debugFactory from 'debug';
import core from '@actions/core';

const debug = debugFactory(`${pkgName}:actions-checkout`);
void debug, core, ComponentActionError;

/**
 * TODO: document me!
 */
export async function checkoutGitRepository() {
  // TODO
}
