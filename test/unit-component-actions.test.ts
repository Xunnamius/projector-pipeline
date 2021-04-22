import { ComponentAction } from '../src/index';
import { asMockedFunction, isolatedImport, withMockedEnv } from './setup';
import { writeFileSync, accessSync } from 'fs';
import { cloneRepository, uploadPaths } from '../src/utils/github';
import { fetch } from 'isomorphic-json-fetch';
import { installNode } from '../src/utils/install';
import { toss } from 'toss-expression';
import * as core from '@actions/core';
import execa from 'execa';
import * as mc from '../src/component-actions/metadata-collect';
import * as md from '../src/component-actions/metadata-download';

import type { ReadonlyDeep } from 'type-fest';
import type {
  ComponentActionFunction,
  ExecaReturnType,
  Metadata,
  InvokerOptions,
  RunnerContext,
  LocalPipelineConfig
} from '../types/global';

const DUMMY_CONTEXT: ReadonlyDeep<RunnerContext> = {
  action: 'action-name',
  actor: 'actor-x',
  eventName: 'event-name',
  issue: { number: 99, repo: 'repo-x', owner: 'owner-x' },
  job: 'job-name',
  payload: {},
  ref: 'refs/heads/main',
  repo: { repo: 'repo-x', owner: 'owner-x' },
  runId: 98765,
  runNumber: 54321,
  sha: 'sha',
  workflow: 'workflow-name'
};

const DUMMY_GLOBAL_CONFIG = jest.requireActual(
  '../dist/pipeline.config.js'
) as typeof import('../dist/pipeline.config');

const FAKE_ROOT = '/non-existent-project';
const FAKE_PACKAGE_CONFIG_PATH = `${FAKE_ROOT}/package.json`;
const FAKE_PIPELINE_CONFIG_PATH = `${FAKE_ROOT}/.github/pipeline.config.js`;
const FAKE_RELEASE_CONFIG_PATH = `${FAKE_ROOT}/release.config.js`;

jest.mock('execa');

jest.mock('fs', () => {
  const fs = jest.createMockFromModule<typeof import('fs')>('fs');
  fs.promises = jest.createMockFromModule<typeof import('fs/promises')>('fs/promises');
  return fs;
});

jest.mock('isomorphic-json-fetch', () => {
  const fetch = jest.fn();
  // @ts-expect-error .get is a sugar method on the fetch function
  fetch.get = jest.fn();
  return { fetch };
});

jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  info: jest.fn()
}));

jest.mock('../src/utils/env');
jest.mock('../src/utils/github');
jest.mock('../src/utils/install');

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedFetchGet = asMockedFunction(fetch.get);
const mockedCoreWarning = asMockedFunction(core.warning);
const mockedWriteFileSync = asMockedFunction(writeFileSync);
const mockedAccessSync = asMockedFunction(accessSync);
const mockedInstallNode = asMockedFunction(installNode);
const mockedCloneRepository = asMockedFunction(cloneRepository);
const mockedUploadPaths = asMockedFunction(uploadPaths);

const mockMetadata: Partial<Metadata> = {};
const mockPackageConfig: Partial<typeof import('../package.json')> = {};
const mockLocalConfig: Partial<LocalPipelineConfig> = {};
const mockReleaseConfig: Partial<typeof import('../release.config.js')> = {};

jest.doMock(FAKE_PACKAGE_CONFIG_PATH, () => mockPackageConfig, {
  virtual: true
});

jest.doMock(FAKE_PIPELINE_CONFIG_PATH, () => mockLocalConfig, {
  virtual: true
});

jest.doMock(FAKE_RELEASE_CONFIG_PATH, () => mockReleaseConfig, {
  virtual: true
});

let mcSpy: jest.SpyInstance;
let mdSpy: jest.SpyInstance;

const doMockMetadataSpies = () => {
  mcSpy = jest
    .spyOn(mc, 'default')
    .mockImplementation(() => Promise.resolve(mockMetadata as Metadata));

  mdSpy = jest
    .spyOn(mc, 'default')
    .mockImplementation(() => Promise.resolve(mockMetadata as Metadata));
};

const restoreMetadataSpies = () => {
  mcSpy.mockRestore();
  mdSpy.mockRestore();
};

const isolatedActionImport = async (action: ComponentAction) => {
  return (await isolatedImport(
    `../src/component-actions/${action}`
  )) as ComponentActionFunction;
};

beforeEach(() => {
  doMockMetadataSpies();
  jest.doMock(FAKE_PACKAGE_CONFIG_PATH);
  jest.doMock(FAKE_PIPELINE_CONFIG_PATH);
  jest.doMock(FAKE_RELEASE_CONFIG_PATH);
  jest.spyOn(process, 'cwd').mockImplementation(() => FAKE_ROOT);
});

afterEach(() => {
  // ? Clear the mock objects without changing their references
  [mockPackageConfig, mockLocalConfig, mockReleaseConfig, mockMetadata].forEach((o) =>
    // @ts-expect-error: TypeScript isn't smart enough to get this
    Object.keys(o).forEach((k) => delete o[k])
  );
});

describe(`${ComponentAction.Audit}`, () => {
  it('succeeds if npm audit is successful', async () => {
    expect.hasAssertions();

    mockMetadata.npmAuditFailLevel = 'test-audit-level';
    mockedExeca.mockReturnValue(
      (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(
      (await isolatedActionImport(ComponentAction.Audit))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).toBeCalledWith(
      'npm',
      expect.arrayContaining(['audit', '--audit-level=test-audit-level']),
      expect.anything()
    );
  });

  it('fails if npm audit is unsuccessful', async () => {
    expect.hasAssertions();

    mockedExeca.mockReturnValue(
      (Promise.reject(new Error('bad')) as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(
      (await isolatedActionImport(ComponentAction.Audit))(DUMMY_CONTEXT, {})
    ).rejects.toMatchObject({
      message: expect.stringContaining('bad')
    });

    expect(mockedExeca).toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Audit))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.Build}`, () => {
  test.todo('succeeds if build script is successful');
  test.todo('fails if ...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Build))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.CleanupNpm}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.Lint}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Lint))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.MetadataCollect}`, () => {
  beforeEach(() => restoreMetadataSpies());

  it('throws if no options.githubToken', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {})
    ).rejects.toMatchObject({
      message: expect.stringContaining('`githubToken`')
    });
  });

  it('throws if global pipeline config fetch fails', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(Promise.reject());

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('failed to parse global pipeline config')
    });
  });

  it('throws if no PR number could be associated with a PR event', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        { ...DUMMY_CONTEXT, eventName: 'pull_request' },
        { githubToken: 'github-token' }
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining('PR number')
    });
  });

  it('throws if failed to find or import package.json', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedAccessSync.mockImplementation(
      (name) => name == FAKE_PACKAGE_CONFIG_PATH && toss(new Error('dummy access error'))
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(`find ${FAKE_PACKAGE_CONFIG_PATH}`)
    });

    jest.dontMock(FAKE_PACKAGE_CONFIG_PATH);
    mockedAccessSync.mockReset();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(`import ${FAKE_PACKAGE_CONFIG_PATH}`)
    });
  });

  it('throws if package.json contains invalid externals scripts', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockPackageConfig.name = 'fake-pkg-1';
    mockPackageConfig.scripts = {
      // @ts-expect-error: package.json inaccuracies
      'build-externals': 'yes'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('expected both')
    });

    mockPackageConfig.name = 'fake-pkg-2';
    mockPackageConfig.scripts = {
      // @ts-expect-error: package.json inaccuracies
      'test-integration-externals': 'yes',
      'build-externals': 'yes'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    mockPackageConfig.name = 'fake-pkg-3';
    mockPackageConfig.scripts = {
      // @ts-expect-error: package.json inaccuracies
      'test-integration-externals': 'yes'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('expected both')
    });
  });

  it('warns if failed to find local pipeline config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedAccessSync.mockImplementation(
      (name) => name == FAKE_PIPELINE_CONFIG_PATH && toss(new Error('dummy access error'))
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('no local pipeline config loaded')
    );
  });

  it('throws if failed to import found local pipeline config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    jest.dontMock(FAKE_PIPELINE_CONFIG_PATH);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(`failed to import ${FAKE_PIPELINE_CONFIG_PATH}`)
    });
  });

  it('warns if failed to find semantic-release config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedAccessSync.mockImplementation(
      (name) => name == FAKE_RELEASE_CONFIG_PATH && toss(new Error('dummy access error'))
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('no release config loaded')
    );
  });

  it('throws if failed to import found semantic-release config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    jest.dontMock(FAKE_RELEASE_CONFIG_PATH);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(`failed to import ${FAKE_RELEASE_CONFIG_PATH}`)
    });
  });

  it('warns if no build-docs script', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('no `build-docs` script')
    );

    mockPackageConfig.scripts = {
      'build-docs': 'yes'
    } as typeof mockPackageConfig.scripts;

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();
  });

  it('warns if code coverage upload is disabled', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockLocalConfig.canUploadCoverage = false;

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('no code coverage'));
  });

  it('returns early if fast skips enabled and pipeline command encountered', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({
        stdout: 'build: commit msg [SKIP CI]'
      }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
        // ? enableFastSkips: true should be the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(0);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        enableFastSkips: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(1);
  });

  it('installs node unless options.node == false', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(1);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        node: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(1);
  });

  it('installs specific node version given options.node.version', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    const opts = {
      version: 'x.y.z'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        npmToken: 'npm-token-y',
        node: opts
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledWith(opts, 'npm-token-y');
  });

  it('clones repository unless options.repository == false', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(1);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        repository: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(1);
  });

  it('clones repository with passed options and token', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    const opts = {
      branchOrTag: 'canary',
      checkoutRef: 'canary',
      fetchDepth: 5,
      repositoryName: 'name',
      repositoryOwner: 'owner',
      repositoryPath: '/path'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        repository: opts
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledWith(opts, 'github-token-x');
  });

  it('uploads artifact only if options.uploadArtifact == true', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({
        json: { ...DUMMY_GLOBAL_CONFIG, artifactRetentionDays: 50 }
      }) as unknown) as ReturnType<typeof mockedFetchGet>
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
        // ? uploadArtifact: false should be the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedUploadPaths).toBeCalledTimes(0);

    await withMockedEnv(
      async () =>
        expect(
          (await isolatedActionImport(ComponentAction.MetadataCollect))(
            { ...DUMMY_CONTEXT, sha: 'commit-sha-xyz' },
            {
              githubToken: 'github-token',
              uploadArtifact: true
            }
          )
        ).resolves.not.toBeUndefined(),
      { RUNNER_OS: 'fake-runner' }
    );

    expect(mockedWriteFileSync).toBeCalled();
    expect(mockedUploadPaths).toBeCalledWith(
      expect.anything(),
      'metadata-fake-runner-commit-sha-xyz',
      50
    );
  });

  it('collected metadata is accurate wrt release repo owner (case insensitive)', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: false
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'xunnamius',
          repo: { repo: 'some-repo', owner: 'xunnamius' }
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: true
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'xunnamius',
          repo: { repo: 'some-repo', owner: 'Xunnamius' }
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: true
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'dependabot[bot]',
          repo: { repo: 'some-repo', owner: 'xunnamius' },
          eventName: 'push',
          payload: { pull_request: { number: 1234 } }
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: false,
      canAutomerge: false
    });
  });

  it('collected metadata is accurate wrt pipeline commands', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca
      .mockReturnValueOnce(
        (Promise.resolve({
          stdout: 'commit msg [CI SKIP]'
        }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({
          stdout: 'commit msg [CD SKIP]'
        }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({
          stdout: 'commit msg'
        }) as unknown) as ExecaReturnType
      );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      shouldSkipCi: true,
      shouldSkipCd: true
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      shouldSkipCi: false,
      shouldSkipCd: true
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      shouldSkipCi: false,
      shouldSkipCd: false
    });
  });

  it('collected metadata is accurate wrt package name and scripts', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      packageName: '<unknown>',
      hasDeploy: false,
      hasDocs: false,
      hasExternals: false,
      hasIntegrationNode: false,
      hasIntegrationExternals: false,
      hasIntegrationClient: false,
      hasIntegrationWebpack: false
    });

    mockPackageConfig.name = 'my-pkg';
    mockPackageConfig.scripts = {
      // @ts-expect-error: forced type widening here
      deploy: 'yes',
      'build-docs': 'yes',
      'build-externals': 'yes',
      'test-integration': 'yes',
      'test-integration-client': 'yes',
      'test-integration-node': 'yes',
      'test-integration-externals': 'yes',
      'test-integration-webpack': 'yes'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      packageName: 'my-pkg',
      hasDeploy: true,
      hasDocs: true,
      hasExternals: true,
      hasIntegrationNode: true,
      hasIntegrationExternals: true,
      hasIntegrationClient: true,
      hasIntegrationWebpack: true
    });
  });

  it('collected metadata is accurate wrt release config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedAccessSync.mockImplementation(
      (name) => name == FAKE_RELEASE_CONFIG_PATH && toss(new Error('dummy access error'))
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      hasReleaseConfig: false
    });

    mockedAccessSync.mockReset();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      hasReleaseConfig: true
    });
  });

  it('collected metadata is accurate wrt a PR context', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'xunnamius',
          repo: { repo: 'some-repo', owner: 'xunnamius' },
          eventName: 'pull_request',
          payload: { pull_request: { number: 555666 } }
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: false,
      canAutomerge: false,
      prNumber: 555666
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'dependabot[bot]',
          repo: { repo: 'some-repo', owner: 'xunnamius' },
          eventName: 'pull_request',
          payload: { pull_request: { number: 1234 } }
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: false,
      canAutomerge: true,
      prNumber: 1234
    });

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'dependabot[bot]',
          repo: { repo: 'some-repo', owner: 'xunnamius' },
          eventName: 'pull_request',
          payload: { pull_request: { number: 1234, draft: true } }
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: false,
      canAutomerge: false,
      prNumber: 1234
    });
  });

  it('collected metadata merges global and local pipeline config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockLocalConfig.debugString = 'debug-string';
    mockReleaseConfig.branches = ['branch-1', 'branch-2'];

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      nodeCurrentVersion: DUMMY_GLOBAL_CONFIG.nodeCurrentVersion,
      nodeTestVersions: DUMMY_GLOBAL_CONFIG.nodeTestVersions,
      webpackTestVersions: DUMMY_GLOBAL_CONFIG.webpackTestVersions,
      commitSha: DUMMY_CONTEXT.sha,
      currentBranch: 'main',
      debugString: 'debug-string',
      releaseBranchConfig: ['branch-1', 'branch-2'],
      committer: {
        email: DUMMY_GLOBAL_CONFIG.committer.email,
        name: DUMMY_GLOBAL_CONFIG.committer.name
      },
      npmAuditFailLevel: DUMMY_GLOBAL_CONFIG.npmAuditFailLevel
    });
  });

  it('administrative keys in global pipeline config cannot be overridden by local config, but other keys can', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({
        json: DUMMY_GLOBAL_CONFIG
      }) as unknown) as ReturnType<typeof mockedFetchGet>
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockLocalConfig.artifactRetentionDays = 50;
    // @ts-expect-errors testing evil local configs
    mockLocalConfig.releaseRepoOwnerWhitelist = ['evil-owner'];
    // @ts-expect-errors testing evil local configs
    mockLocalConfig.releaseActorWhitelist = ['evil-actor'];
    // @ts-expect-errors testing evil local configs
    mockLocalConfig.automergeActorWhitelist = ['evil-actor'];
    // @ts-expect-errors testing evil local configs
    mockLocalConfig.npmIgnoreDistTags = ['evil-tags'];

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(
        {
          ...DUMMY_CONTEXT,
          actor: 'evil-actor',
          repo: { repo: 'good-repo', owner: 'Xunnamius' }
        },
        {
          githubToken: 'github-token',
          uploadArtifact: true
        }
      )
    ).resolves.toMatchObject<Partial<Metadata>>({
      canAutomerge: false,
      canRelease: false,
      canRetryAutomerge: DUMMY_GLOBAL_CONFIG.canRetryAutomerge,
      canUploadCoverage: DUMMY_GLOBAL_CONFIG.canUploadCoverage,
      releaseActorWhitelist: DUMMY_GLOBAL_CONFIG.releaseActorWhitelist,
      automergeActorWhitelist: DUMMY_GLOBAL_CONFIG.automergeActorWhitelist,
      releaseRepoOwnerWhitelist: DUMMY_GLOBAL_CONFIG.releaseRepoOwnerWhitelist,
      npmIgnoreDistTags: DUMMY_GLOBAL_CONFIG.npmIgnoreDistTags,
      artifactRetentionDays: 50
    });

    expect(mockedUploadPaths).toBeCalledWith(expect.anything(), expect.anything(), 50);
  });
});

describe(`${ComponentAction.MetadataDownload}`, () => {
  beforeEach(() => restoreMetadataSpies());

  test.todo('succeeds if ...');
  test.todo('fails if...');
});

describe(`${ComponentAction.SmartDeploy}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.SmartDeploy))(DUMMY_CONTEXT, {
        npmToken: 'npm-token',
        gpgPassphrase: 'gpg-passphrase',
        gpgPrivateKey: 'gpg-private-key',
        githubToken: 'github-token'
      })
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCd == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCd = true;

    await expect(
      (await isolatedActionImport(ComponentAction.SmartDeploy))(DUMMY_CONTEXT, {
        npmToken: 'npm-token',
        gpgPassphrase: 'gpg-passphrase',
        gpgPrivateKey: 'gpg-private-key',
        githubToken: 'github-token'
      })
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationClient}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationClient))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationExternals}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationExternals))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationNode}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationNode))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationWebpack}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationWebpack))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestUnit}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestUnit))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.VerifyNpm}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.VerifyNpm))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCd == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCd = true;

    await expect(
      (await isolatedActionImport(ComponentAction.VerifyNpm))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});
