import { ComponentAction } from '../src/index';
import { asMockedFunction, isolatedImport, withMockedEnv } from './setup';
import { readFileSync, writeFileSync } from 'fs';
import { fetch } from 'isomorphic-json-fetch';
import { installNode } from '../src/utils/install';
import { cloneRepository, uploadPaths } from '../src/utils/github';
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
  RunnerContext
} from '../types/global';

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
  // @ts-expect-error .post is a sugar method on the fetch function
  fetch.post = jest.fn();
  return { fetch };
});

jest.mock('@actions/core', () => ({
  warning: jest.fn(),
  info: jest.fn()
}));

jest.mock('../src/utils/env');
jest.mock('../src/utils/github');
jest.mock('../src/utils/install');

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

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedFetchGet = asMockedFunction(fetch.get);
const mockedCoreInfo = asMockedFunction(core.info);
const mockedCoreWarning = asMockedFunction(core.warning);
const mockedReadFileSync = asMockedFunction(readFileSync);
const mockedWriteFileSync = asMockedFunction(writeFileSync);
const mockedInstallNode = asMockedFunction(installNode);
const mockedCloneRepository = asMockedFunction(cloneRepository);
const mockedUploadPaths = asMockedFunction(uploadPaths);

let mockMetadata: Partial<Metadata> = {};

const mcSpy = jest.spyOn(mc, 'default');
const mdSpy = jest.spyOn(mc, 'default');

const setupMetadataSpies = () => {
  mcSpy.mockImplementation(() => Promise.resolve(mockMetadata as Metadata));
  mdSpy.mockImplementation(() => Promise.resolve(mockMetadata as Metadata));
};

setupMetadataSpies();

afterEach(() => {
  mockMetadata = {};
  jest.clearAllMocks();
});

describe(`${ComponentAction.Audit}`, () => {
  it('succeeds if npm audit is successful', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ComponentActionFunction;

    mockMetadata.npmAuditFailLevel = 'test-audit-level';
    mockedExeca.mockReturnValueOnce(
      (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).toBeCalledWith(
      'npm',
      expect.arrayContaining(['audit', '--audit-level=test-audit-level']),
      expect.anything()
    );
  });

  it('fails if npm audit is unsuccessful', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ComponentActionFunction;

    mockedExeca.mockReturnValueOnce(
      (Promise.reject(new Error('bad')) as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(action(DUMMY_CONTEXT, {})).rejects.toMatchObject({
      message: expect.stringContaining('bad')
    });

    expect(mockedExeca).toBeCalled();
  });

  it('sets appropriate default options', async () => {
    expect.hasAssertions();

    const options: InvokerOptions = { githubToken: 'faker' };
    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ComponentActionFunction;

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(action(DUMMY_CONTEXT, options)).resolves.toBeUndefined();
    expect(options).toStrictEqual({ githubToken: 'faker' });
    expect(mockedExeca).toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.Build}`, () => {
  test.todo('succeeds if build script is successful');
  test.todo('fails if ...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Build}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.CleanupNpm}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.CleanupNpm}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(
      action(DUMMY_CONTEXT, { npmToken: 'npm-token' })
    ).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.Lint}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Lint}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.MetadataCollect}`, () => {
  beforeAll(() => jest.restoreAllMocks());
  afterAll(() => setupMetadataSpies());

  it('throws if no options.githubToken', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(action(DUMMY_CONTEXT, {})).rejects.toMatchObject({
      message: expect.stringContaining('`githubToken`')
    });
  });

  it('throws if fetch fails', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(Promise.reject());

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('failed to parse global pipeline config')
    });

    expect(mockedFetchGet).toBeCalledTimes(1);
  });

  it('throws if no PR number could be associated with a PR event', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedReadFileSync.mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(
        { ...DUMMY_CONTEXT, eventName: 'pull_request' },
        {
          githubToken: 'github-token',
          repository: false
        }
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining('PR number')
    });

    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(1);
  });

  it('throws if failed to parse package.json', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync.mockReturnValueOnce('{}').mockImplementationOnce(() => {
      throw new Error('bad');
    });

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('failed to parse package.json')
    });

    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(2);
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

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockImplementationOnce(
        () => `{
          "name":"fakePkg",
          "scripts": {
            "build-externals": "yes"
          }
        }`
      )
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockImplementationOnce(
        () => `{
          "name":"fakePkg",
          "scripts": {
            "test-integration-externals": "yes"
          }
        }`
      )
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockImplementationOnce(
        () => `{
          "name":"fakePkg",
          "scripts": {
            "test-integration-externals": "yes",
            "build-externals": "yes"
          }
        }`
      );

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('expected both')
    });

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('expected both')
    });

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedFetchGet).toBeCalledTimes(3);
    expect(mockedExeca).toBeCalledTimes(3);
    expect(mockedReadFileSync).toBeCalledTimes(9);

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
  });

  it('warns when no local pipeline config found', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync
      .mockImplementationOnce(() => {
        throw new Error('bad');
      })
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('no optional local config loaded')
    );
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);
  });

  it('warns if failed to find/parse release.config.js', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockImplementationOnce(() => {
        throw new Error('bad');
      });

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('no release config loaded')
    );
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);
  });

  it('warns if no build-docs script', async () => {
    expect.hasAssertions();

    mockedFetchGet
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      )
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      );

    mockedExeca
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{"scripts":{"build-docs":"yes"}}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(
      expect.stringContaining('no `build-docs` script')
    );
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledTimes(1);
    expect(mockedFetchGet).toBeCalledTimes(2);
    expect(mockedExeca).toBeCalledTimes(2);
    expect(mockedReadFileSync).toBeCalledTimes(6);
  });

  it('warns if code coverage upload is disabled', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync
      .mockReturnValueOnce('{"canUploadCoverage":false}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCoreWarning).toBeCalledWith(expect.stringContaining('no code coverage'));
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);
  });

  it('returns early if fast skips enabled and pipeline command encountered', async () => {
    expect.hasAssertions();

    mockedFetchGet
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      )
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      );

    mockedExeca
      .mockReturnValueOnce(
        (Promise.resolve({
          stdout: 'build: commit msg [SKIP CI]'
        }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({
          stdout: 'build: commit msg [SKIP CI]'
        }) as unknown) as ExecaReturnType
      );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
        // ? enableFastSkips: true should be the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(1);

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        enableFastSkips: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedFetchGet).toBeCalledTimes(2);
    expect(mockedExeca).toBeCalledTimes(2);
    expect(mockedReadFileSync).toBeCalledTimes(4);
  });

  it('installs node unless options.node == false', async () => {
    expect.hasAssertions();

    mockedFetchGet
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      )
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      );

    mockedExeca
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(1);
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        node: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledTimes(1);
    expect(mockedFetchGet).toBeCalledTimes(2);
    expect(mockedExeca).toBeCalledTimes(2);
    expect(mockedReadFileSync).toBeCalledTimes(6);
  });

  it('installs specific node version given options.node.version', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    const opts = {
      version: 'x.y.z'
    };

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        npmToken: 'npm-token-y',
        node: opts
      })
    ).resolves.not.toBeUndefined();

    expect(mockedInstallNode).toBeCalledWith(opts, 'npm-token-y');
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);
  });

  it('clones repository unless options.repository == false', async () => {
    expect.hasAssertions();

    mockedFetchGet
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      )
      .mockReturnValueOnce(
        (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
          typeof mockedFetchGet
        >
      );

    mockedExeca
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(1);
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token',
        repository: false
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledTimes(1);
    expect(mockedFetchGet).toBeCalledTimes(2);
    expect(mockedExeca).toBeCalledTimes(2);
    expect(mockedReadFileSync).toBeCalledTimes(6);
  });

  it('clones repository with passed options and token', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    const opts = {
      branchOrTag: 'canary',
      checkoutRef: 'canary',
      fetchDepth: 5,
      repositoryName: 'name',
      repositoryOwner: 'owner',
      repositoryPath: '/path'
    };

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token-x',
        repository: opts
      })
    ).resolves.not.toBeUndefined();

    expect(mockedCloneRepository).toBeCalledWith(opts, 'github-token-x');
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);
  });

  it('uploads artifact only if options.uploadArtifact == true', async () => {
    expect.hasAssertions();

    mockedFetchGet
      .mockReturnValueOnce(
        (Promise.resolve({
          json: { ...DUMMY_GLOBAL_CONFIG, artifactRetentionDays: 50 }
        }) as unknown) as ReturnType<typeof mockedFetchGet>
      )
      .mockReturnValueOnce(
        (Promise.resolve({
          json: { ...DUMMY_GLOBAL_CONFIG, artifactRetentionDays: 50 }
        }) as unknown) as ReturnType<typeof mockedFetchGet>
      );

    mockedExeca
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      )
      .mockReturnValueOnce(
        (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
      );

    mockedReadFileSync
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
        // ? uploadArtifact: false should be the default
      })
    ).resolves.not.toBeUndefined();

    expect(mockedUploadPaths).toBeCalledTimes(0);
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);

    await withMockedEnv(
      () =>
        expect(
          action(
            { ...DUMMY_CONTEXT, sha: 'commit-sha-xyz' },
            {
              githubToken: 'github-token',
              uploadArtifact: true
            }
          )
        ).resolves.not.toBeUndefined(),
      { RUNNER_OS: 'fake-runner' }
    );

    expect(mockedUploadPaths).toBeCalledWith(
      expect.anything(),
      'metadata-fake-runner-commit-sha-xyz',
      50
    );
    expect(mockedFetchGet).toBeCalledTimes(2);
    expect(mockedExeca).toBeCalledTimes(2);
    expect(mockedReadFileSync).toBeCalledTimes(6);
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

    mockedReadFileSync.mockReturnValue('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(DUMMY_CONTEXT, {
        githubToken: 'github-token'
      })
    ).resolves.toMatchObject<Partial<Metadata>>({
      canRelease: false
    });

    await expect(
      action(
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
      action(
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
      action(
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

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
    mockedReadFileSync.mockReset();
  });

  it('collected metadata is accurate wrt skipping CI/CD', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValue(
      (Promise.resolve({ json: DUMMY_GLOBAL_CONFIG }) as unknown) as ReturnType<
        typeof mockedFetchGet
      >
    );

    mockedExeca.mockReturnValue(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync.mockReturnValue('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
    mockedReadFileSync.mockReset();
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

    mockedReadFileSync.mockReturnValue('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
    mockedReadFileSync.mockReset();
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

    mockedReadFileSync.mockReturnValue('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
    mockedReadFileSync.mockReset();
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

    mockedReadFileSync.mockReturnValue('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(
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
      action(
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
      action(
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

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
    mockedReadFileSync.mockReset();
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

    mockedReadFileSync.mockReturnValue('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    mockedFetchGet.mockReset();
    mockedExeca.mockReset();
    mockedReadFileSync.mockReset();
  });

  it('administrative keys in global pipeline config cannot be overridden by local pipeline config', async () => {
    expect.hasAssertions();

    mockedFetchGet.mockReturnValueOnce(
      (Promise.resolve({
        json: DUMMY_GLOBAL_CONFIG
      }) as unknown) as ReturnType<typeof mockedFetchGet>
    );

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve({ stdout: 'commit msg' }) as unknown) as ExecaReturnType
    );

    mockedReadFileSync
      .mockReturnValueOnce(
        `{
        "artifactRetentionDays": 50,
        "releaseRepoOwnerWhitelist": ['evil-owner'],
        "releaseActorWhitelist": ['evil-actor'],
        "automergeActorWhitelist": ['evil-actor'],
        "npmIgnoreDistTags": ['evil-tags']
      }`
      )
      .mockReturnValueOnce('{}')
      .mockReturnValueOnce('{}');

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.MetadataCollect}`
    )) as ComponentActionFunction;

    await expect(
      action(
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
      artifactRetentionDays: DUMMY_GLOBAL_CONFIG.artifactRetentionDays
    });

    expect(mockedUploadPaths).toBeCalledWith(
      expect.anything(),
      expect.anything(),
      DUMMY_GLOBAL_CONFIG.artifactRetentionDays
    );
    expect(mockedFetchGet).toBeCalledTimes(1);
    expect(mockedExeca).toBeCalledTimes(1);
    expect(mockedReadFileSync).toBeCalledTimes(3);
  });
});

describe(`${ComponentAction.MetadataDownload}`, () => {
  beforeAll(() => jest.restoreAllMocks());
  afterAll(() => setupMetadataSpies());
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');
});

describe(`${ComponentAction.SmartDeploy}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.SmartDeploy}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(
      action(DUMMY_CONTEXT, {
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

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.SmartDeploy}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCd = true;

    await expect(
      action(DUMMY_CONTEXT, {
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
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationClient}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationExternals}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationExternals}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationNode}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationNode}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestIntegrationWebpack}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationWebpack}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.TestUnit}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestUnit}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.VerifyNpm}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.VerifyNpm}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCd == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.VerifyNpm}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCd = true;

    await expect(action(DUMMY_CONTEXT, {})).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});
