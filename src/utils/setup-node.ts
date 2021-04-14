import { name as pkgName } from '../../package.json';
import { ComponentActionError } from '../error';
import debugFactory from 'debug';
import core from '@actions/core';

const debug = debugFactory(`${pkgName}:actions-setup-node`);
void debug, core, ComponentActionError;
