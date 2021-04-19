import { name as pkgName } from '../package.json';
import { asMockedFunction, withMockedOutput, withMockedEnv } from './setup';
import { PRIVILEGED_DEPS_URI } from '../src/index';
import { hashElement as hashFiles } from 'folder-hash';
import { readFileSync, accessSync } from 'fs';
import debugFactory from 'debug';
import cache from '@actions/cache';
import artifact from '@actions/artifact';
import core from '@actions/core';
import execa from 'execa';

import * as env from '../src/utils/env';
import * as github from '../src/utils/github';
import * as install from '../src/utils/install';

import type { ExecaReturnType, Metadata } from '../types/global';
import type { HashElementNode } from 'folder-hash';

jest.mock('fs', () => {
  const fs = jest.createMockFromModule<typeof import('fs')>('fs');
  fs.promises = jest.createMockFromModule<typeof import('fs/promises')>('fs/promises');
  return fs;
});

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
  warning: jest.fn(),
  setCommandEcho: jest.fn(),
  exportVariable: jest.fn()
}));

let runtimeDebugNamespaces: string;

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedReadFileSync = asMockedFunction(readFileSync);
const mockedAccessSync = asMockedFunction(accessSync);
const mockedHashFiles = asMockedFunction(hashFiles);
const mockedCacheSaveCache = asMockedFunction(cache.saveCache);
const mockedCacheRestoreCache = asMockedFunction(cache.restoreCache);
const mockedCoreWarning = asMockedFunction(core.warning);
const mockedCoreSetCommandEcho = asMockedFunction(core.setCommandEcho);
const mockedCoreExportVariable = asMockedFunction(core.exportVariable);

const mockedArtifactCreateUploadArtifact = asMockedFunction<
  ReturnType<typeof artifact.create>['uploadArtifact']
>();

const mockedArtifactCreateDownloadArtifact = asMockedFunction<
  ReturnType<typeof artifact.create>['downloadArtifact']
>();

asMockedFunction(artifact.create).mockReturnValue(({
  uploadArtifact: mockedArtifactCreateUploadArtifact,
  downloadArtifact: mockedArtifactCreateDownloadArtifact
} as unknown) as ReturnType<typeof artifact.create>);

beforeEach(() => {
  // ? If debugging has been enabled for the projector-pipeline repo itself,
  // ? disable it temporarily so as to not interfere these tests
  runtimeDebugNamespaces = debugFactory.disable();
});

afterEach(() => {
  runtimeDebugNamespaces && debugFactory.enable(runtimeDebugNamespaces);
  jest.clearAllMocks();
});

describe('env', () => {
  it('enables debug if metadata.debugString is provided', async () => {
    expect.hasAssertions();

    env.setupEnv(({} as unknown) as Metadata);

    expect(mockedCoreSetCommandEcho).toBeCalledTimes(0);
    expect(mockedCoreExportVariable).toBeCalledTimes(0);
    expect(mockedCoreWarning).toBeCalledTimes(0);

    await withMockedEnv(
      () =>
        env.setupEnv(({
          debugString: 'x-y-z:some-namespace'
        } as unknown) as Metadata),
      {}
    );

    expect(mockedCoreSetCommandEcho).toBeCalledTimes(1);
    expect(mockedCoreExportVariable).toBeCalledTimes(1);
  });

  it('`debugString==true` enables global debugging', async () => {
    expect.hasAssertions();
    expect(debugFactory('x-y-z:some-namespace').enabled).toBeFalse();

    await withMockedEnv(
      () =>
        withMockedOutput(() => {
          env.setupEnv(({ debugString: true } as unknown) as Metadata);
        }),
      {}
    );

    expect(debugFactory('x-y-z:some-namespace').enabled).toBeTrue();
    expect(debugFactory(`${pkgName}:test`).enabled).toBeTrue();
    expect(mockedCoreWarning).toBeCalledTimes(0);
  });

  it('enables debug if process.env.DEBUG is provided', async () => {
    expect.hasAssertions();

    await withMockedEnv(() => env.setupEnv(({} as unknown) as Metadata), {
      DEBUG: 'x-y-z:some-namespace'
    });

    expect(mockedCoreSetCommandEcho).toBeCalledTimes(1);
    expect(mockedCoreExportVariable).toBeCalledTimes(1);
    expect(mockedCoreWarning).toBeCalledTimes(1);
  });

  it('issues warning if debugString does not fully enable debugging', async () => {
    expect.hasAssertions();
    env.setupEnv(({ debugString: 'x:y:z' } as unknown) as Metadata);
    expect(mockedCoreWarning).toBeCalledTimes(1);
  });
});

describe('github', () => {
  describe('::uploadPaths', () => {
    it('calls uploadArtifact', async () => {
      expect.hasAssertions();

      mockedArtifactCreateUploadArtifact.mockReturnValueOnce(
        (Promise.resolve({
          artifactItems: { length: 5 },
          failedItems: { length: 0 }
        }) as unknown) as ReturnType<typeof mockedArtifactCreateUploadArtifact>
      );

      await expect(github.uploadPaths([], 'key', 90)).resolves.toBeUndefined();
      expect(mockedArtifactCreateUploadArtifact).toBeCalledTimes(1);
    });

    it('throws if no items uploaded and no failed items', async () => {
      expect.hasAssertions();

      mockedArtifactCreateUploadArtifact.mockReturnValueOnce(
        (Promise.resolve({
          artifactItems: { length: 0 },
          failedItems: { length: 0 }
        }) as unknown) as ReturnType<typeof mockedArtifactCreateUploadArtifact>
      );

      await expect(github.uploadPaths([], 'key', 90)).rejects.toMatchObject({
        message: expect.stringContaining('paths matched 0 items')
      });
    });

    it('throws if failed items', async () => {
      expect.hasAssertions();

      mockedArtifactCreateUploadArtifact.mockReturnValueOnce(
        (Promise.resolve({
          artifactItems: { length: 5 },
          failedItems: { length: 5 }
        }) as unknown) as ReturnType<typeof mockedArtifactCreateUploadArtifact>
      );

      await expect(github.uploadPaths([], 'key', 90)).rejects.toMatchObject({
        message: expect.stringContaining('5 items failed to upload')
      });
    });
  });

  describe('::downloadPaths', () => {
    it('calls downloadArtifact', async () => {
      expect.hasAssertions();
      await expect(github.downloadPaths('key', './destination')).resolves.toBeUndefined();
      expect(mockedArtifactCreateDownloadArtifact).toBeCalledTimes(1);
    });
  });

  describe('::cachePaths', () => {
    it('calls saveCache', async () => {
      expect.hasAssertions();
      await expect(github.cachePaths([], 'key')).resolves.toBeUndefined();
      expect(mockedCacheSaveCache).toBeCalledTimes(1);
    });
  });

  describe('::uncachePaths', () => {
    it('calls restoreCache and returns boolean', async () => {
      expect.hasAssertions();
      await expect(github.uncachePaths([], 'key')).resolves.toBeBoolean();
      expect(mockedCacheRestoreCache).toBeCalledTimes(1);
    });
  });

  it('::cloneRepository', async () => {
    expect.hasAssertions();
  });
});

describe('install', () => {
  describe('::installPeerDeps', () => {
    it('noop when using npm@>=7', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '7.0.0' }) as unknown) as ExecaReturnType
      );

      await expect(install.installPeerDeps()).resolves.toBeUndefined();
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

      await expect(install.installPeerDeps()).resolves.toBeUndefined();
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

      await expect(install.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedReadFileSync).toBeCalledTimes(1);
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedExeca).toBeCalledWith(
        'npm',
        ['install', '--no-save', 'package-1@>=9.5.x package-2@^5.4.3'],
        { stdio: 'inherit' }
      );

      expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('^5.4.3'));
    });

    it('noop with npm@<7 when no peer dependencies', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      mockedReadFileSync.mockReturnValueOnce('{"name":"dummy-pkg"}');

      await expect(install.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedReadFileSync).toBeCalledTimes(1);

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      mockedReadFileSync.mockReturnValueOnce(
        '{"name":"dummy-pkg","peerDependencies":{}}'
      );

      await expect(install.installPeerDeps()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedReadFileSync).toBeCalledTimes(2);
    });

    it('noop with npm@<7 when no package.json (vacuous case)', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '6.9.8' }) as unknown) as ExecaReturnType
      );

      await expect(install.installPeerDeps()).rejects.toMatchObject({
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
        .spyOn(github, 'uncachePaths')
        .mockImplementationOnce(() => Promise.resolve(false))
        .mockImplementationOnce(() => Promise.resolve(true));

      const installPeerDepsSpy = jest
        .spyOn(install, 'installPeerDeps')
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve());

      mockedHashFiles
        .mockImplementationOnce(() => Promise.resolve({ hash: 'x' } as HashElementNode))
        .mockImplementationOnce(() => Promise.resolve({ hash: 'x' } as HashElementNode))
        .mockImplementationOnce(() => Promise.resolve({ hash: 'x' } as HashElementNode));

      await expect(install.installDependencies()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(1);
      expect(install.installPeerDeps).toBeCalledTimes(1);
      expect(uncachePathsSpy).toBeCalledTimes(1);
      expect(mockedHashFiles).toBeCalledTimes(2);

      await expect(install.installDependencies()).resolves.toBeUndefined();
      expect(mockedExeca).toBeCalledTimes(2);
      expect(install.installPeerDeps).toBeCalledTimes(2);
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
        .spyOn(install, 'installPeerDeps')
        .mockImplementationOnce(() => Promise.resolve())
        .mockImplementationOnce(() => Promise.resolve());

      mockedAccessSync.mockImplementationOnce(() => {
        throw new Error('(mock) package.json not found');
      });

      await expect(install.installPrivilegedDependencies()).resolves.toBeUndefined();
      expect(install.installPeerDeps).toBeCalledTimes(1);
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

      await expect(install.installPrivilegedDependencies()).rejects.toMatchObject({
        message: expect.stringContaining('refusing to overwrite existing package.json')
      });
      expect(mockedAccessSync).toBeCalledTimes(1);
    });
  });
});
