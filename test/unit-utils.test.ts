import { name as pkgName } from '../package.json';
import { asMockedFunction, withMockedOutput, withMockedEnv } from './setup';
import { PRIVILEGED_DEPS_URI } from '../src/index';
import { hashElement as hashFiles } from 'folder-hash';
import { readFileSync, accessSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import cache from '@actions/cache';
import artifact from '@actions/artifact';
import core from '@actions/core';
import toolCache from '@actions/tool-cache';
import debugFactory from 'debug';
import execa from 'execa';
import os from 'os';

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

jest.mock('path');
jest.mock('execa');
jest.mock('folder-hash');

jest.mock('@actions/cache', () => ({
  saveCache: jest.fn(),
  restoreCache: jest.fn()
}));

jest.mock('@actions/tool-cache', () => ({
  find: jest.fn(),
  downloadTool: jest.fn(),
  extractTar: jest.fn(),
  cacheDir: jest.fn()
}));

jest.mock('@actions/artifact', () => ({
  create: jest.fn()
}));

jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  addPath: jest.fn(),
  setCommandEcho: jest.fn(),
  exportVariable: jest.fn()
}));

let runtimeDebugNamespaces: string;

const mockedResolve = asMockedFunction(resolve);
const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedReadFileSync = asMockedFunction(readFileSync);
const mockedWriteFileSync = asMockedFunction(writeFileSync);
const mockedAccessSync = asMockedFunction(accessSync);
const mockedHashFiles = asMockedFunction(hashFiles);
const mockedCacheSaveCache = asMockedFunction(cache.saveCache);
const mockedCacheRestoreCache = asMockedFunction(cache.restoreCache);
const mockedCoreWarning = asMockedFunction(core.warning);
const mockedCoreSetCommandEcho = asMockedFunction(core.setCommandEcho);
const mockedCoreAddPath = asMockedFunction(core.addPath);
const mockedCoreExportVariable = asMockedFunction(core.exportVariable);
const mockedToolCacheFind = asMockedFunction(toolCache.find);
const mockedToolCacheDownloadTool = asMockedFunction(toolCache.downloadTool);
const mockedToolCacheExtractTar = asMockedFunction(toolCache.extractTar);
const mockedToolCacheCacheDir = asMockedFunction(toolCache.cacheDir);

const mockedArtifactCreateUploadArtifact = asMockedFunction<
  ReturnType<typeof artifact.create>['uploadArtifact']
>();

const mockedArtifactCreateDownloadArtifact = asMockedFunction<
  ReturnType<typeof artifact.create>['downloadArtifact']
>();

beforeEach(() => {
  // ? If debugging has been enabled for the projector-pipeline repo itself,
  // ? disable it temporarily so as to not interfere these tests
  runtimeDebugNamespaces = debugFactory.disable();

  asMockedFunction(artifact.create).mockReturnValue(({
    uploadArtifact: mockedArtifactCreateUploadArtifact,
    downloadArtifact: mockedArtifactCreateDownloadArtifact
  } as unknown) as ReturnType<typeof artifact.create>);
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

  it('debugString == true enables global debugging', async () => {
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

  describe('::cloneRepository', () => {
    it('successfully clones a repository', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType);

      mockedResolve.mockReturnValueOnce('/resolved/repository/path');

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'main',
            fetchDepth: 1,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          'github-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(3);
      expect(mockedResolve).toBeCalledTimes(1);

      expect(mockedExeca).toBeCalledWith(
        'git',
        expect.arrayContaining([
          'main',
          '1',
          'https://github-token@github.com/MxRepoOwner/my-repo.git',
          '/resolved/repository/path'
        ]),
        expect.anything()
      );
    });

    it('successfully clones a repository wrt options.fetchDepth', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType);

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'main',
            fetchDepth: 12345,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          'github-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(3);
      expect(mockedExeca).toBeCalledWith(
        'git',
        expect.arrayContaining(['--depth', '12345']),
        expect.anything()
      );
    });

    it('repository is bare (--no-checkout) if options.checkoutRef == false', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType);

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: false,
            fetchDepth: 1,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          'github-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(3);
      expect(mockedExeca).toBeCalledWith(
        'git',
        expect.arrayContaining(['--no-checkout']),
        expect.anything()
      );
    });

    it('checks out ref only if non-false options.checkoutRef != options.branchOrTag', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType);

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'canary',
            fetchDepth: 1,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          'github-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(4);
      expect(mockedExeca).toBeCalledWith(
        'git',
        expect.arrayContaining(['checkout', 'canary']),
        expect.anything()
      );
    });

    it('does not throw if we cannot turn off gc', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce(
          (Promise.reject('git config command failed') as unknown) as ExecaReturnType
        );

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'canary',
            fetchDepth: 1,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          'github-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(4);
    });

    it('functions properly without github-token', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType);

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'canary',
            fetchDepth: 1,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          undefined
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(4);
      expect(mockedExeca).toBeCalledWith(
        'git',
        expect.arrayContaining(['https://github.com/MxRepoOwner/my-repo.git']),
        expect.anything()
      );
    });

    it('fetches complete history when options.fetchDepth <= 0', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: '999999.0.0' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType)
        .mockReturnValueOnce((Promise.resolve() as unknown) as ExecaReturnType);

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'main',
            fetchDepth: 0,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          undefined
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(3);
      expect(mockedExeca).not.toBeCalledWith(
        'git',
        expect.arrayContaining(['--depth']),
        expect.anything()
      );

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'main',
            fetchDepth: -999,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          undefined
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(6);
      expect(mockedExeca).not.toBeCalledWith(
        'git',
        expect.arrayContaining(['--depth']),
        expect.anything()
      );
    });

    it('throws if system git version too low', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '1.2.34' }) as unknown) as ExecaReturnType
      );

      await expect(
        github.cloneRepository(
          {
            branchOrTag: 'main',
            checkoutRef: 'main',
            fetchDepth: 1,
            repositoryName: 'my-repo',
            repositoryOwner: 'MxRepoOwner',
            repositoryPath: 'repository/path'
          },
          'github-token'
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining('git version 1.2.34 is below')
      });

      expect(mockedExeca).toBeCalledTimes(1);
    });
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
        expect.arrayContaining([
          'install',
          '--no-save',
          'package-1@>=9.5.x package-2@>=5.4.3'
        ]),
        expect.anything()
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
        expect.arrayContaining([
          'install',
          '--no-save',
          'package-1@>=9.5.x package-2@^5.4.3'
        ]),
        expect.anything()
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

      expect(mockedExeca).toBeCalledWith(
        'npm',
        expect.arrayContaining(['install']),
        expect.anything()
      );

      expect(mockedExeca).toBeCalledWith(
        'curl',
        expect.arrayContaining(['-o', 'package.json', '-L', PRIVILEGED_DEPS_URI]),
        expect.anything()
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
  describe('::installNode', () => {
    it('throws if no latest node version from npm', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: '' }) as unknown) as ExecaReturnType
      );

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          'unable to determine latest node version relative to semver "x.y.z"'
        )
      });

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedToolCacheFind).not.toBeCalled();
    });

    it('handles singular latest node version from npm', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({ stdout: 'r.s.t' }) as unknown) as ExecaReturnType
      );

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedToolCacheFind).toBeCalledWith('node', 'r.s.t', expect.anything());
    });

    it('handles plural latest node version from npm', async () => {
      expect.hasAssertions();

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve({
          stdout:
            "pkg@a.b.c 'a.b.c'\npkg@d.e.f 'd.e.f'\npkg@g.h.i 'g.h.i'\npkg@r.s.t 'r.s.t'"
        }) as unknown) as ExecaReturnType
      );

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedToolCacheFind).toBeCalledWith('node', 'r.s.t', expect.anything());
    });

    it('only downloads node if not found in tool cache', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: 'r.s.t' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: 'u.v.w' }) as unknown) as ExecaReturnType
        );

      mockedToolCacheFind.mockReturnValueOnce('').mockReturnValueOnce('/path/to/node');

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedToolCacheExtractTar).toBeCalledTimes(1);
      expect(mockedToolCacheCacheDir).toBeCalledTimes(1);
      expect(mockedToolCacheDownloadTool).toBeCalledWith(
        `https://nodejs.org/dist/vr.s.t/node-vr.s.t-${os.platform()}-${os.arch()}.tar.gz`
      );

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedToolCacheFind).toBeCalledTimes(2);
      expect(mockedToolCacheExtractTar).toBeCalledTimes(1);
      expect(mockedToolCacheCacheDir).toBeCalledTimes(1);
      expect(mockedToolCacheDownloadTool).toBeCalledTimes(1);
    });

    it('always adds node to PATH', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: 'r.s.t' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: 'r.s.t' }) as unknown) as ExecaReturnType
        );

      mockedToolCacheCacheDir.mockReturnValueOnce(Promise.resolve('/returned/path'));

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedCoreAddPath).toBeCalledWith('/returned/path');

      mockedToolCacheFind.mockReturnValueOnce('/cached/path');

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedToolCacheCacheDir).toBeCalledTimes(1);
      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedCoreAddPath).toBeCalledWith('/cached/path');
    });

    it('writes auth info to ~/.npmrc only if npm-token is provided', async () => {
      expect.hasAssertions();

      mockedExeca
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: 'r.s.t' }) as unknown) as ExecaReturnType
        )
        .mockReturnValueOnce(
          (Promise.resolve({ stdout: 'r.s.t' }) as unknown) as ExecaReturnType
        );

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          'npm-x-token'
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(1);
      expect(mockedWriteFileSync).toBeCalledWith(
        '~/.npmrc',
        expect.stringContaining('npm-x-token')
      );

      await expect(
        install.installNode(
          {
            version: 'x.y.z'
          },
          undefined
        )
      ).resolves.toBeUndefined();

      expect(mockedExeca).toBeCalledTimes(2);
      expect(mockedWriteFileSync).toBeCalledTimes(1);
    });
  });
});
