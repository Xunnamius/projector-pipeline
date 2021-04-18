import { asMockedFunction } from './setup';
import { PRIVILEGED_DEPS_URI } from '../src/index';
import { hashElement as hashFiles } from 'folder-hash';
import { readFileSync, accessSync } from 'fs';
import cache from '@actions/cache';
import artifact from '@actions/artifact';
import core from '@actions/core';
import execa from 'execa';

import * as actionsArtifact from '../src/utils/actions-artifact';
import * as actionsCache from '../src/utils/actions-cache';
import * as setupEnv from '../src/utils/setup-env';
import * as gitCheckout from '../src/utils/git-checkout';
import * as setupNode from '../src/utils/setup-node';
import * as installDeps from '../src/utils/install-deps';

import type { ExecaReturnType } from '../types/global';
import type { HashElementNode } from 'folder-hash';

// TODO: remove these
void actionsArtifact;
void setupEnv;
void gitCheckout;
void setupNode;

jest.mock('fs');
jest.mock('execa');
jest.mock('folder-hash');

jest.mock('@actions/cache', () => ({
  saveCache: jest.fn(),
  restoreCache: jest.fn()
}));

jest.mock('@actions/artifact', () => ({
  create: jest.fn()
}));

jest.mock('@actions/core', () => ({
  warning: jest.fn()
}));

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedReadFileSync = asMockedFunction(readFileSync);
const mockedAccessSync = asMockedFunction(accessSync);
const mockedHashFiles = asMockedFunction(hashFiles);

const mockedCacheSaveCache = asMockedFunction(cache.saveCache);
const mockedCacheRestoreCache = asMockedFunction(cache.restoreCache);
const mockedArtifactCreate = asMockedFunction(artifact.create);
const mockedCoreWarning = asMockedFunction(core.warning);

// TODO: remove these
void mockedCacheSaveCache;
void mockedCacheRestoreCache;
void mockedArtifactCreate;

afterEach(() => {
  jest.clearAllMocks();
});

describe('actions-artifact', () => {
  test.todo('me!');
});

describe('actions-cache', () => {
  test.todo('me!');
});

describe('git-checkout', () => {
  test.todo('me!');
});

describe('install-deps', () => {
  describe('::installPeerDeps', () => {
    it('noop when using npm@>=7', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '7.0.0' }) as unknown) as ExecaReturnType
      );

      await expect(installDeps.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedReadFileSync).not.toBeCalled();
    });

    it('installs listed peer deps with npm@<7', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      mockedReadFileSync.mockReturnValueOnce(`{
        "name":"dummy-pkg",
        "peerDependencies":{
          "package-1": ">=9.5.x",
          "package-2": ">=5.4.3"
        }
      }`);

      await expect(installDeps.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedReadFileSync).toBeCalledTimes(1);
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedExeca).toBeCalledWith(
        'npm',
        ['install', '--no-save', 'package-1@>=9.5.x package-2@>=5.4.3'],
        { stdio: 'inherit' }
      );
    });

    it('issues a warning when one or more peer dependencies do not begin with >', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      mockedReadFileSync.mockReturnValueOnce(`{
        "name":"dummy-pkg",
        "peerDependencies":{
          "package-1": ">=9.5.x",
          "package-2": "^5.4.3"
        }
      }`);

      await expect(installDeps.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedReadFileSync).toBeCalledTimes(1);
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedExeca).toBeCalledWith(
        'npm',
        ['install', '--no-save', 'package-1@>=9.5.x package-2@^5.4.3'],
        { stdio: 'inherit' }
      );

      expect(mockedCoreWarning).toBeCalledWith(
        expect.stringContaining(
          'installed peer dependency "package-2" with version specifier "^5.4.3"'
        )
      );
    });

    it('noop with npm@<7 when no peer dependencies', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      mockedReadFileSync.mockReturnValueOnce('{"name":"dummy-pkg"}');

      await expect(installDeps.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedReadFileSync).toBeCalledTimes(1);

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      mockedReadFileSync.mockReturnValueOnce(
        '{"name":"dummy-pkg","peerDependencies":{}}'
      );

      await expect(installDeps.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedReadFileSync).toBeCalledTimes(2);
    });

    it('noop with npm@<7 when no package.json (vacuous case)', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      await expect(installDeps.installPeerDeps()).rejects.toMatchObject({
        message: expect.stringContaining('failed to parse')
      });

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedReadFileSync).toBeCalledTimes(1);
    });
  });

  describe('::installDependencies', () => {
    it(`installs and caches proper paths only if they aren't already cached`, async () => {
      expect.hasAssertions();

      const uncachePathsSpy = jest
        .spyOn(actionsCache, 'uncachePaths')
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));

      const installPeerDepsSpy = jest
        .spyOn(installDeps, 'installPeerDeps')
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve());

      mockedHashFiles
        .mockImplementationOnce(() => Promise.resolve({ hash: 'x' } as HashElementNode))
        .mockImplementationOnce(() => Promise.resolve({ hash: 'x' } as HashElementNode))
        .mockImplementationOnce(() => Promise.resolve({ hash: 'x' } as HashElementNode));

      await expect(installDeps.installDependencies()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(1);
      expect(installDeps.installPeerDeps).toBeCalledTimes(1);
      expect(uncachePathsSpy).toBeCalledTimes(1);
      expect(mockedHashFiles).toBeCalledTimes(2);

      await expect(installDeps.installDependencies()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(2);
      expect(installDeps.installPeerDeps).toBeCalledTimes(2);
      expect(uncachePathsSpy).toBeCalledTimes(2);
      expect(mockedHashFiles).toBeCalledTimes(3);

      installPeerDepsSpy.mockRestore();
      uncachePathsSpy.mockRestore();
    });
  });

  describe('::installPrivilegedDependencies', () => {
    it('pulls remote file and installs dependencies', async () => {
      expect.hasAssertions();

      const installPeerDepsSpy = jest
        .spyOn(installDeps, 'installPeerDeps')
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve());

      mockedAccessSync.mockImplementationOnce(() => {
        throw new Error('(mock) package.json not found');
      });

      await expect(installDeps.installPrivilegedDependencies()).resolves.toBeUndefined();
      expect(installDeps.installPeerDeps).toBeCalledTimes(1);
      expect(mockedAccessSync).toBeCalledTimes(1);
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedExeca).toBeCalledWith('npm', ['install'], { stdio: 'inherit' });
      expect(mockedExeca).toBeCalledWith(
        'curl',
        ['-o', 'package.json', '-L', PRIVILEGED_DEPS_URI],
        { stdio: 'inherit' }
      );

      installPeerDepsSpy.mockRestore();
    });

    it('throws if package.json already exists', async () => {
      expect.hasAssertions();

      await expect(installDeps.installPrivilegedDependencies()).rejects.toMatchObject({
        message: expect.stringContaining('refusing to overwrite existing package.json')
      });
      expect(mockedAccessSync).toBeCalledTimes(1);
    });
  });
});

describe('setup-env', () => {
  test.todo('me!');
});

describe('setup-node', () => {
  test.todo('me!');
});
