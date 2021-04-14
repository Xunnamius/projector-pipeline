import { ComponentAction } from '../src/index';
import { asMockedFunction, isolatedImport } from './setup';
import execa from 'execa';
import core from '@actions/core';

import type { ImportedComponentAction, InvokerOptions, Metadata } from '../types/global';

jest.mock('execa');
jest.mock('@actions/core', () => jest.fn());

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedCore = (core as unknown) as jest.Mock<typeof core>;
const mockedCoreWarning = asMockedFunction<typeof core['warning']>();
let mockMetadata: Partial<Metadata> = {};

mockedCore.mockImplementation(
  () =>
    (({
      warning: mockedCoreWarning
    } as unknown) as typeof core)
);

beforeAll(() => {
  jest.mock('../src/component-actions/metadata-collect', () => () =>
    Promise.resolve(mockMetadata)
  );

  jest.mock('../src/component-actions/metadata-download', () => () =>
    Promise.resolve(mockMetadata)
  );
});

afterEach(() => {
  mockMetadata = {};
  jest.clearAllMocks();
});

describe(`ComponentAction: ${ComponentAction.Audit}`, () => {
  it('succeeds if npm audit is successful', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ImportedComponentAction['default'];

    mockMetadata.npmAuditFailLevel = 'test-audit-level';
    mockedExeca.mockReturnValueOnce(
      (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).toBeCalledWith(
      'npm',
      ['audit', '--audit-level=test-audit-level'],
      {
        stdio: 'inherit'
      }
    );
  });

  it('fails if npm audit is unsuccessful', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ImportedComponentAction['default'];

    mockedExeca.mockReturnValueOnce(
      (Promise.reject(new Error('bad')) as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(action()).rejects.toMatchObject({
      message: expect.stringContaining('bad')
    });

    expect(mockedExeca).toBeCalled();
  });

  it('sets appropriate default options', async () => {
    expect.hasAssertions();

    const options: InvokerOptions = { githubToken: 'faker' };
    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ImportedComponentAction['default'];

    mockedExeca.mockReturnValueOnce(
      (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(action(options)).resolves.toBeUndefined();
    expect(options).toStrictEqual({ githubToken: 'faker' });
    expect(mockedExeca).toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Audit}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.Build}`, () => {
  test.todo('succeeds if build script is successful');
  test.todo('fails if ...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Build}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.CleanupNpm}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.CleanupNpm}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.Lint}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.Lint}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.MetadataCollect}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');
});

describe(`ComponentAction: ${ComponentAction.MetadataDownload}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');
});

describe(`ComponentAction: ${ComponentAction.SmartDeploy}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.SmartDeploy}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCd == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.SmartDeploy}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCd = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.TestIntegrationClient}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationClient}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.TestIntegrationExternals}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationExternals}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.TestIntegrationNode}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationNode}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.TestIntegrationWebpack}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestIntegrationWebpack}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.TestUnit}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.TestUnit}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`ComponentAction: ${ComponentAction.VerifyNpm}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');

  it('skipped if `metadata.shouldSkipCi == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.VerifyNpm}`
    )) as ImportedComponentAction['default'];

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});
