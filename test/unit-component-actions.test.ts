import { ComponentAction, UPLOADED_METADATA_PATH } from '../src/index';
import { asMockedFunction, isolatedImport, withMockedEnv } from './setup';
import { writeFileSync, accessSync } from 'fs';
import { fetch } from 'isomorphic-json-fetch';
import {
  installNode,
  installDependencies,
  installPrivilegedDependencies
} from '../src/utils/install';
import { toss } from 'toss-expression';
import * as core from '@actions/core';
import execa from 'execa';
import * as mc from '../src/component-actions/metadata-collect';
import * as md from '../src/component-actions/metadata-download';

import {
  cloneRepository,
  uploadPaths,
  downloadPaths,
  cachePaths,
  uncachePaths
} from '../src/utils/github';

import type { ReadonlyDeep } from 'type-fest';
import type {
  ComponentActionFunction,
  ExecaReturnType,
  Metadata,
  RunnerContext,
  LocalPipelineConfig,
  InvokerOptions
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
const mockedDownloadPaths = asMockedFunction(downloadPaths);
const mockedCachePaths = asMockedFunction(cachePaths);
const mockedUncachePaths = asMockedFunction(uncachePaths);
const mockedInstallDependencies = asMockedFunction(installDependencies);
const mockedInstallPrivilegedDependencies = asMockedFunction(
  installPrivilegedDependencies
);

const mockMetadata: Partial<Metadata> = {};
const mockPackageConfig: Partial<typeof import('../package.json')> = {};
const mockLocalConfig: Partial<LocalPipelineConfig> = {};
const mockReleaseConfig: Partial<typeof import('../release.config.js')> = {};

// ! Don't forget to add a doMock for each of these in the `beforeEach` as well

jest.doMock(FAKE_PACKAGE_CONFIG_PATH, () => mockPackageConfig, {
  virtual: true
});

jest.doMock(FAKE_PIPELINE_CONFIG_PATH, () => mockLocalConfig, {
  virtual: true
});

jest.doMock(FAKE_RELEASE_CONFIG_PATH, () => mockReleaseConfig, {
  virtual: true
});

jest.doMock(UPLOADED_METADATA_PATH, () => mockMetadata, {
  virtual: true
});

// ! \\

let mcSpy: jest.SpyInstance;
let mdSpy: jest.SpyInstance;

const doMockMetadataSpies = () => {
  mcSpy = jest
    .spyOn(mc, 'default')
    .mockImplementation(() => Promise.resolve(mockMetadata as Metadata));

  mdSpy = jest
    .spyOn(md, 'default')
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
  jest.doMock(UPLOADED_METADATA_PATH);
  jest.spyOn(process, 'cwd').mockImplementation(() => FAKE_ROOT);
});

afterEach(() => {
  // ? Clear the mock objects without changing their references
  [mockPackageConfig, mockLocalConfig, mockReleaseConfig, mockMetadata].forEach((o) =>
    // @ts-expect-error: TypeScript isn't smart enough to get this
    Object.keys(o).forEach((k) => delete o[k])
  );
});

describe(`audit action`, () => {
  it('[audit] succeeds if npm audit is successful', async () => {
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

  it('[audit] fails if npm audit is unsuccessful', async () => {
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

  it('[audit] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Audit))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedExeca).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('build action', () => {
  it('[build] builds docs only if metadata.hasDocs == true', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.Build))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedExeca).not.toBeCalledWith(
      'npm',
      expect.arrayContaining(['build-docs']),
      expect.anything()
    );

    mockMetadata.hasDocs = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Build))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedExeca).toBeCalledWith(
      'npm',
      expect.arrayContaining(['build-docs']),
      expect.anything()
    );
  });

  it('[build] uncaches coverage data and uploads build artifact', async () => {
    expect.hasAssertions();

    mockMetadata.commitSha = 'sha';
    mockMetadata.artifactRetentionDays = 2;

    await withMockedEnv(
      async () => {
        await expect(
          (await isolatedActionImport(ComponentAction.Build))(DUMMY_CONTEXT, {})
        ).resolves.toBeUndefined();
      },
      { RUNNER_OS: 'fake-os' }
    );

    expect(mockedUncachePaths).toBeCalledWith(['./coverage'], `coverage-fake-os-sha`);
    expect(uploadPaths).toBeCalledWith(expect.anything(), `build-fake-os-sha`, 2);
  });

  it('[build] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Build))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('cleanup-npm action', () => {
  it('[cleanup-npm] throws if missing options.npmToken', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {})
    ).rejects.toMatchObject({ message: expect.stringContaining('`npmToken`') });
  });

  it('[cleanup-npm] respects metadata.npmIgnoreDistTags', async () => {
    expect.hasAssertions();

    mockMetadata.packageName = 'my-fake-pkg';
    mockMetadata.npmIgnoreDistTags = ['ignore-me'];
    mockMetadata.releaseBranchConfig = [];

    mockedExeca
      .mockImplementationOnce(() => (Promise.resolve() as unknown) as ExecaReturnType)
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: ''
          }) as unknown) as ExecaReturnType
      )
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'latest\ncanary\n5.x\n5.1.x\nsomething-else\nignore-me'
          }) as unknown) as ExecaReturnType
      );

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();

    expect(mockedExeca).not.toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'ignore-me'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'latest'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'canary'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', '5.x'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', '5.1.x'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'something-else'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledTimes(8);
  });

  it('[cleanup-npm] matches release branches to dist tags, deletes others', async () => {
    expect.hasAssertions();

    mockMetadata.npmIgnoreDistTags = ['latest'];
    mockMetadata.packageName = 'my-fake-pkg';
    mockMetadata.releaseBranchConfig = [
      '+([0-9])?(.{+([0-9]),x}).x',
      'main',
      {
        name: 'canary',
        channel: 'canary',
        prerelease: true
      }
    ];

    mockedExeca
      .mockImplementationOnce(() => (Promise.resolve() as unknown) as ExecaReturnType)
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'branch-1\nmain\n5.x\n555\ncanary'
          }) as unknown) as ExecaReturnType
      )
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'latest\ncanary\n5.x\nrelease-5.x\nrelease-555\nsomething-else'
          }) as unknown) as ExecaReturnType
      );

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'something-else'],
      expect.anything()
    );

    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'release-555'],
      expect.anything()
    );

    expect(mockedExeca).not.toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'latest'],
      expect.anything()
    );

    expect(mockedExeca).not.toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', '5.x'],
      expect.anything()
    );

    expect(mockedExeca).not.toBeCalledWith(
      'npm',
      ['dist-tag', 'rm', 'my-fake-pkg', 'release-5.x'],
      expect.anything()
    );
  });

  it('[cleanup-npm] writes npm-token when deleting dist tags', async () => {
    expect.hasAssertions();

    mockMetadata.packageName = 'my-fake-pkg';
    mockMetadata.npmIgnoreDistTags = [];
    mockMetadata.releaseBranchConfig = [];

    mockedExeca
      .mockImplementationOnce(() => (Promise.resolve() as unknown) as ExecaReturnType)
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'canary'
          }) as unknown) as ExecaReturnType
      )
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'canary'
          }) as unknown) as ExecaReturnType
      );

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();

    expect(mockedWriteFileSync).toBeCalledWith(
      '~/.npmrc',
      expect.stringContaining('npm-token')
    );
  });

  it('[cleanup-npm] throws if token write fails or tag deletion fails', async () => {
    expect.hasAssertions();

    mockMetadata.npmIgnoreDistTags = [];
    mockMetadata.releaseBranchConfig = [];

    mockedExeca
      .mockImplementationOnce(() => (Promise.resolve() as unknown) as ExecaReturnType)
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'canary'
          }) as unknown) as ExecaReturnType
      )
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'canary'
          }) as unknown) as ExecaReturnType
      )
      .mockImplementationOnce(() => toss(new Error('badness error')))
      .mockImplementationOnce(() => (Promise.resolve() as unknown) as ExecaReturnType)
      .mockImplementation(
        () => (Promise.resolve({ stdout: '' }) as unknown) as ExecaReturnType
      );

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).rejects.toMatchObject({ message: expect.stringContaining('one or more') });

    mockedWriteFileSync.mockImplementationOnce(() => toss(new Error('another error')));

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).rejects.toMatchObject({ message: expect.stringContaining('one or more') });

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();
  });

  it('[cleanup-npm] does not throw if dist-tag operation fails', async () => {
    expect.hasAssertions();

    mockMetadata.npmIgnoreDistTags = [];
    mockMetadata.releaseBranchConfig = [];

    mockedExeca
      .mockImplementationOnce(() => (Promise.resolve() as unknown) as ExecaReturnType)
      .mockImplementationOnce(
        () =>
          (Promise.resolve({
            stdout: 'canary'
          }) as unknown) as ExecaReturnType
      )
      .mockImplementationOnce(() => (Promise.reject() as unknown) as ExecaReturnType);

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();
  });

  it('[cleanup-npm] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.CleanupNpm))(DUMMY_CONTEXT, {
        npmToken: 'npm-token'
      })
    ).resolves.toBeUndefined();

    expect(mockedExeca).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('lint action', () => {
  it('[lint] runs to completion', async () => {
    expect.hasAssertions();
    await expect(
      (await isolatedActionImport(ComponentAction.Lint))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
  });

  it('[lint] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.Lint))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('metadata-collect action', () => {
  beforeEach(() => restoreMetadataSpies());

  it('[metadata-collect] throws if no options.githubToken', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {})
    ).rejects.toMatchObject({
      message: expect.stringContaining('`githubToken`')
    });
  });

  it('[metadata-collect] throws if global pipeline config fetch fails', async () => {
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

  it('[metadata-collect] throws if no PR number could be associated with a PR event', async () => {
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

  it('[metadata-collect] throws if failed to find or import package.json', async () => {
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

  it('[metadata-collect] throws if package.json contains invalid externals scripts', async () => {
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

  it('[metadata-collect] warns if failed to find local pipeline config', async () => {
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

  it('[metadata-collect] throws if failed to import found local pipeline config', async () => {
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

  it('[metadata-collect] warns if failed to find semantic-release config', async () => {
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

  it('[metadata-collect] throws if failed to import found semantic-release config', async () => {
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

  it('[metadata-collect] warns if no build-docs script', async () => {
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

  it('[metadata-collect] warns if code coverage upload is disabled', async () => {
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

  it('[metadata-collect] returns early if fast skips enabled and pipeline command encountered', async () => {
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

  it('[metadata-collect] installs node unless options.node == false', async () => {
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
        node: true // ? This is the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(2);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        node: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(2);
  });

  it('[metadata-collect] installs specific node version given options.node.version', async () => {
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

  it('[metadata-collect] clones repository unless options.repository == false', async () => {
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
        repository: true // ? This is the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(2);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        repository: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(2);
  });

  it('[metadata-collect] clones repository with passed options and token', async () => {
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

  it('[metadata-collect] uploads artifact only if options.uploadArtifact == true', async () => {
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

  it('[metadata-collect] collected metadata is accurate wrt release repo owner (case insensitive)', async () => {
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

  it('[metadata-collect] collected metadata is accurate wrt pipeline commands', async () => {
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

  it('[metadata-collect] collected metadata is accurate wrt package name and scripts', async () => {
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

  it('[metadata-collect] collected metadata is accurate wrt release config', async () => {
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

  it('[metadata-collect] collected metadata is accurate wrt a PR context', async () => {
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

  it('[metadata-collect] collected metadata merges global and local pipeline config', async () => {
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

  it('[metadata-collect] administrative keys in global pipeline config cannot be overridden by local config, but other keys can', async () => {
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

  it('[metadata-collect] issues debug warning if options.forceWarnings == true and debugString metadata given', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({
        json: DUMMY_GLOBAL_CONFIG
      }) as unknown) as ReturnType<typeof mockedFetchGet>
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockLocalConfig.debugString = 'debug-string';

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
        // forceWarnings: false should be the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).not.toBeCalledWith('PIPELINE IS RUNNING IN DEBUG MODE');

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        forceWarnings: true
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('PIPELINE IS RUNNING IN DEBUG MODE')
    );
  });

  it('[metadata-collect] issues debug warning if options.forceWarnings == true and process.env.DEBUG given', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({
        json: DUMMY_GLOBAL_CONFIG
      }) as unknown) as ReturnType<typeof mockedFetchGet>
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        forceWarnings: true
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).not.toBeCalledWith('PIPELINE IS RUNNING IN DEBUG MODE');

    await withMockedEnv(
      async () => {
        await expect(
          (await isolatedActionImport(ComponentAction.MetadataCollect))(DUMMY_CONTEXT, {
            githubToken: 'github-token',
            forceWarnings: true
          })
        ).resolves.not.toBeUndefined();

        expect(mockedCoreWarning).toBeCalledWith(
          expect.stringContaining('PIPELINE IS RUNNING IN DEBUG MODE')
        );
      },
      { DEBUG: 'debug-string' }
    );
  });
});

describe('metadata-download action', () => {
  beforeEach(() => restoreMetadataSpies());

  it('[metadata-download] throws if no options.githubToken', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {})
    ).rejects.toMatchObject({
      message: expect.stringContaining('`githubToken`')
    });
  });

  it('[metadata-download] throws if artifact download or parse fails', async () => {
    expect.hasAssertions();

    mockedDownloadPaths.mockImplementationOnce(() =>
      Promise.reject(new Error('fake error'))
    );

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('failed to acquire metadata artifact')
    });

    mockedDownloadPaths.mockReset();
    jest.dontMock(UPLOADED_METADATA_PATH);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('failed to import metadata artifact')
    });
  });

  it('[metadata-download] installs node unless options.node == false', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(1);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        node: true // ? This is the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(2);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        node: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(2);
  });

  it('[metadata-download] installs specific node version given options.node.version', async () => {
    expect.hasAssertions();

    const opts = {
      version: 'x.y.z'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        npmToken: 'npm-token-y',
        node: opts
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledWith(opts, 'npm-token-y');
  });

  it('[metadata-download] clones repository specified in metadata unless options.repository == false', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(1);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        repository: true // ? This is the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(2);

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        repository: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(2);
  });

  it('[metadata-download] clones repository with passed options and token', async () => {
    expect.hasAssertions();

    const opts = {
      branchOrTag: 'canary',
      checkoutRef: 'canary',
      fetchDepth: 5,
      repositoryName: 'name',
      repositoryOwner: 'owner',
      repositoryPath: '/path'
    };

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        repository: opts
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledWith(opts, 'github-token-x');
  });

  it('[metadata-download] reissues warnings if options.forceWarnings == true and debugString metadata given', async () => {
    expect.hasAssertions();

    mockMetadata.debugString = 'debug-string';
    mockMetadata.hasDocs = false;

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x'
        // forceWarnings: false should be the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).not.toBeCalled();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        forceWarnings: true
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('debug-string'));
    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('build-docs'));
    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('code coverage'));
    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('release config'));
  });

  it('[metadata-download] reissues warnings if options.forceWarnings == true and process.env.DEBUG given', async () => {
    expect.hasAssertions();

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        forceWarnings: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).not.toBeCalled();

    await withMockedEnv(
      async () => {
        await expect(
          (await isolatedActionImport(ComponentAction.MetadataDownload))(DUMMY_CONTEXT, {
            githubToken: 'github-token-x',
            forceWarnings: true
          })
        ).resolves.not.toBeUndefined();
      },
      { DEBUG: 'debug-string' }
    );

    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('debug-string'));
  });

  it('[metadata-download] downloads metadata artifact and outputs identical result', async () => {
    expect.hasAssertions();

    mockMetadata.artifactRetentionDays = 44;
    mockMetadata.automergeActorWhitelist = ['x'];
    mockMetadata.canAutomerge = true;
    mockMetadata.canRelease = true;
    mockMetadata.canRetryAutomerge = false;
    mockMetadata.canUploadCoverage = true;
    // @ts-expect-error: objects are serialized as JsonRegExp
    mockMetadata.ciSkipRegex = { source: 'f', flags: 'i' };
    // @ts-expect-error: objects are serialized as JsonRegExp
    mockMetadata.cdSkipRegex = { source: 'g' };
    mockMetadata.commitSha = 'good-sha';
    mockMetadata.committer = { email: 'good-email', name: 'good-name' };
    mockMetadata.currentBranch = 'good-branch';
    mockMetadata.debugString = 'good-debug-string';
    mockMetadata.hasDeploy = true;
    mockMetadata.hasDocs = false;
    mockMetadata.hasExternals = false;
    mockMetadata.hasIntegrationClient = false;
    mockMetadata.hasIntegrationExternals = false;
    mockMetadata.hasIntegrationNode = false;
    mockMetadata.hasIntegrationWebpack = false;
    mockMetadata.hasReleaseConfig = true;
    mockMetadata.nodeCurrentVersion = 'x.y.z';
    mockMetadata.nodeTestVersions = ['w', 'x', 'y'];
    mockMetadata.npmAuditFailLevel = 'good-fail';
    mockMetadata.npmIgnoreDistTags = ['good'];
    mockMetadata.packageName = 'good-package-name';
    mockMetadata.prNumber = 333;
    mockMetadata.releaseActorWhitelist = ['x'];
    mockMetadata.releaseBranchConfig = [];
    mockMetadata.releaseRepoOwnerWhitelist = ['x'];
    mockMetadata.shouldSkipCd = false;
    mockMetadata.shouldSkipCi = false;
    mockMetadata.webpackTestVersions = ['a'];

    mockPackageConfig.name = 'evil-name';
    mockLocalConfig.debugString = 'evil-debug-string';
    mockReleaseConfig.branches = ['evil'];

    await expect(
      (await isolatedActionImport(ComponentAction.MetadataDownload))(
        {
          ...DUMMY_CONTEXT,
          actor: 'evil-actor',
          eventName: 'workflow_run',
          ref: 'refs/heads/evil-branch',
          // ? An "evil" sha would cause the download step to fail (tested above)
          sha: 'evil-sha'
        },
        {
          githubToken: 'github-token'
        }
      )
    ).resolves.toStrictEqual({
      ...mockMetadata,
      ciSkipRegex: /f/i,
      cdSkipRegex: /g/
    });

    expect(mockedExeca).not.toBeCalledWith(
      expect.stringContaining('npm'),
      expect.anything(),
      expect.anything()
    );
  });
});

describe('smart-deploy action', () => {
  test.todo('[smart-deploy] (todo)');

  it('[smart-deploy] skipped if `metadata.shouldSkipCi == true`', async () => {
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

    expect(mockedInstallPrivilegedDependencies).not.toBeCalled();
    expect(mdSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });

  it('[smart-deploy] skipped if `metadata.shouldSkipCd == true`', async () => {
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

    expect(mockedInstallPrivilegedDependencies).not.toBeCalled();
    expect(mdSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('test-integration-client action', () => {
  it('[test-integration-client] runs to completion', async () => {
    expect.hasAssertions();
    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationClient))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();
  });

  it('[test-integration-client] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationClient))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('test-integration-externals action', () => {
  it('[test-integration-externals] runs to completion', async () => {
    expect.hasAssertions();
    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationExternals))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();
  });

  it('[test-integration-externals] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationExternals))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('test-integration-node action', () => {
  it('[test-integration-node] runs to completion', async () => {
    expect.hasAssertions();
    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationNode))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();
  });

  it('[test-integration-node] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationNode))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('test-integration-webpack action', () => {
  it('[test-integration-webpack] runs to completion', async () => {
    expect.hasAssertions();
    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationWebpack))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();
  });

  it('[test-integration-webpack] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestIntegrationWebpack))(
        DUMMY_CONTEXT,
        {}
      )
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('test-unit action', () => {
  it('[test-unit] uploads coverage data only if metadata.canUploadCoverage == true', async () => {
    expect.hasAssertions();

    await withMockedEnv(
      async () => {
        mockMetadata.commitSha = 'sha';
        mockMetadata.canUploadCoverage = false;

        await expect(
          (await isolatedActionImport(ComponentAction.TestUnit))(DUMMY_CONTEXT, {})
        ).resolves.toBeUndefined();

        mockMetadata.canUploadCoverage = true;

        await expect(
          (await isolatedActionImport(ComponentAction.TestUnit))(DUMMY_CONTEXT, {})
        ).resolves.toBeUndefined();
      },
      { RUNNER_OS: 'fake-os' }
    );

    expect(mockedCachePaths).toBeCalledWith(['./coverage'], 'coverage-fake-os-sha');
    expect(mockedInstallDependencies).toBeCalledTimes(2);
  });

  it('[test-unit] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.TestUnit))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedInstallDependencies).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});

describe('verify-npm action', () => {
  test.todo('[verify-npm] (todo)');

  it('[verify-npm] skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCi = true;

    await expect(
      (await isolatedActionImport(ComponentAction.VerifyNpm))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedExeca).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });

  it('[verify-npm] skipped if `metadata.shouldSkipCd == true`', async () => {
    expect.hasAssertions();

    mockMetadata.shouldSkipCd = true;

    await expect(
      (await isolatedActionImport(ComponentAction.VerifyNpm))(DUMMY_CONTEXT, {})
    ).resolves.toBeUndefined();

    expect(mockedExeca).not.toBeCalled();
    expect(mcSpy).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({ enableFastSkips: true } as InvokerOptions)
    );
  });
});
