import { name as pkgName } from '../../package.json';
import { cachePaths, uncachePaths } from './github';
import { hashElement as hashFiles } from 'folder-hash';
import { PRIVILEGED_DEPS_URI } from '../index';
import { ComponentActionError } from '../error';
import { readFileSync, writeFileSync, accessSync, constants as fs } from 'fs';
import semver from 'semver';
import debugFactory from 'debug';
import execa from 'execa';
import core from '@actions/core';
import toolCache from '@actions/tool-cache';
import os from 'os';

import type { InvokerOptions, NodeOptions } from '../../types/global';

const debug = debugFactory(`${pkgName}:install`);

/**
 * Install dependencies using `npm ci`; peer dependencies are installed manually
 * if using `npm@<7`.
 */
export async function installDependencies() {
  const os = process.env.RUNNER_OS;

  const cacheHit = await uncachePaths(
    ['~/.npm'],
    `npm-${os}-${(await hashFiles('**/package-lock.json')).hash}`,
    ['npm-${os}-']
  );

  debug(`npm installer cache hit: ${cacheHit}`);

  debug('installing dependencies');
  await execa('npm', ['ci'], { stdio: 'inherit' });
  await installPeerDeps();

  if (!cacheHit) {
    await cachePaths(
      ['~/.npm'],
      `npm-${os}-${(await hashFiles('**/package-lock.json')).hash}`
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

    let peerDeps = '';

    try {
      peerDeps = Object.entries<string>(
        JSON.parse(readFileSync('./package.json', { encoding: 'utf-8' }))
          ?.peerDependencies || {}
      )
        .map(([p, v]) => {
          if (!v.startsWith('>')) {
            core.warning(
              `installed peer dependency "${p}" version "${v}", which does not begin with ">". This is likely a typo`
            );
          }

          return `${p}@${v}`;
        })
        .join(' ');
    } catch (e) {
      throw new ComponentActionError(`failed to parse package.json: ${e}`);
    }

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
  let pkgJsonExists = true;

  try {
    accessSync('package.json', fs.F_OK);
  } catch {
    pkgJsonExists = false;
  }

  if (pkgJsonExists)
    throw new ComponentActionError('refusing to overwrite existing package.json');

  debug(`downloading privileged package.json from ${PRIVILEGED_DEPS_URI}`);
  await execa('curl', ['-o', 'package.json', '-L', PRIVILEGED_DEPS_URI], {
    stdio: 'inherit'
  });

  debug('installing privileged dependencies');
  await execa('npm', ['install'], { stdio: 'inherit' });
  await installPeerDeps();
}

/**
 * Downloads and installs Node, configuring `PATH` to include the Node binary.
 * Node version downloads are cached using `@actions/tool-cache` similar to the
 * official `actions/setup-node` GitHub Action.
 */
export async function installNode(
  { version }: NodeOptions,
  npmToken: InvokerOptions['npmToken']
) {
  // ? Resolve the latest version of `version`
  const latestNodeVersion = await execa('npm', [
    'show',
    `node@${version}`,
    'version'
  ]).then(
    ({ stdout }) => stdout.split('\n').slice(-1)[0].split(' ')[0].split('@').slice(-1)[0]
  );

  if (!latestNodeVersion) {
    throw new ComponentActionError(
      `unable to determine latest node version relative to semver "${version}"`
    );
  }

  debug(
    `determined latest available node version relative to semver ${version} is: ${latestNodeVersion}`
  );

  const osArch = os.arch();
  const osPlat = os.platform();
  const downloadName = `node-v${latestNodeVersion}-${osPlat}-${osArch}`;
  const downloadUri = `https://nodejs.org/dist/v${latestNodeVersion}/${downloadName}.tar.gz`;

  // ? Download latest version from cache if found or nodejs.org if not
  let cachePath = toolCache.find('node', latestNodeVersion, osArch);

  if (cachePath) debug(`found cached ${downloadName}, download skipped (yay)`);
  else {
    debug(`no cached ${downloadName} found, downloading from ${downloadUri}`);

    const downloadPath = await toolCache.downloadTool(downloadUri);

    debug(`node successfully downloaded to ${downloadPath}`);
    debug('extracting node');

    const extractedPath = await toolCache.extractTar(downloadPath, undefined, [
      'xz',
      '--strip',
      '1'
    ]);

    debug('installing node into local tool cache');

    cachePath = await toolCache.cacheDir(
      extractedPath,
      'node',
      latestNodeVersion,
      osArch
    );
  }

  // ? Prepend installed node to the path going forward
  debug(`prepending to PATH: ${cachePath}`);
  core.addPath(cachePath);

  // ? Add authorization information
  if (npmToken) {
    debug('writing auth token to ~/.npmrc');
    writeFileSync('~/.npmrc', `//registry.npmjs.org/:_authToken=${npmToken}`);
  } else debug('no auth token committed to disk');
}
