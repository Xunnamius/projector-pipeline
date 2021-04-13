import { name as pkgName } from '../../package.json';
import { cachePaths, uncachePaths } from './actions-cache';
import { hashElement as hashFiles } from 'folder-hash';
import { PRIVILEGED_DEPS_URI } from '../index';
import { readFileSync } from 'fs';
import semver from 'semver';
import debugFactory from 'debug';
import execa from 'execa';

const debug = debugFactory(`${pkgName}:install-deps`);

/**
 * Install dependencies using `npm ci`; peer dependencies are installed manually
 * if using `npm@<7`.
 */
export async function installDependencies() {
  const cacheHit = await uncachePaths(
    ['~/.npm'],
    `npm-${process.env.RUNNER_OS}-${(await hashFiles('**/package-lock.json')).hash}`,
    ['npm-${process.env.RUNNER_OS}-']
  );

  debug(`npm installer cache hit: ${cacheHit}`);

  debug('installing dependencies');
  await execa('npm', ['ci'], { stdio: 'inherit' });
  await installPeerDeps();

  if (!cacheHit) {
    await cachePaths(
      ['~/.npm'],
      `npm-${process.env.RUNNER_OS}-${(await hashFiles('**/package-lock.json')).hash}`
    );
  }
}

/**
 * Manual (legacy) installer for peer dependencies. Noop for npm@>=7.
 */
export async function installPeerDeps() {
  const { stdout: npmVersion } = await execa('npm', ['--version']);

  if (semver.satisfies(npmVersion, '<7.0')) {
    debug(`old npm version ${npmVersion} detected; checking for peer dependencies`);

    const peerDeps = Object.entries(
      JSON.parse(readFileSync('./package.json', { encoding: 'utf-8' })) || {}
    )
      .map(([p, v]) => `${p}@${v}`)
      .join(' ');

    if (peerDeps.length) {
      debug(`installing peer dependencies`);
      await execa('npm', ['install', '--no-save', peerDeps], { stdio: 'inherit' });
    }
  }
}

/**
 * Install privileged dependencies using `npm install` and the global (remote)
 * `package.json file`; peer dependencies are installed manually if using
 * `npm@<7`.
 */
export async function installPrivilegedDependencies() {
  debug(`downloading privileged package.json from ${PRIVILEGED_DEPS_URI}`);
  await execa('curl', ['-LJO', PRIVILEGED_DEPS_URI], { stdio: 'inherit' });

  debug('installing privileged dependencies');
  await execa('npm', ['install'], { stdio: 'inherit' });
  await installPeerDeps();
}
