import { ComponentAction } from '../src/index';
import { asMockedFunction, isolatedImport } from './setup';
import execa from 'execa';
import * as core from '@actions/core';

import type { ComponentActionFunction, InvokerOptions, Metadata } from '../types/global';

jest.mock('execa');

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

const mockedCoreInfo = asMockedFunction(core.info);
const mockedCoreWarning = asMockedFunction(core.warning);
let mockMetadata: Partial<Metadata> = {};

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

    await expect(action()).resolves.toBeUndefined();
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
    )) as ComponentActionFunction;

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
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCi = true;

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action({ npmToken: 'npm-token' })).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});

describe(`${ComponentAction.MetadataCollect}`, () => {
  test.todo('succeeds if ...');
  test.todo('fails if...');
  test.todo('sets appropriate default options');
});

describe(`${ComponentAction.MetadataDownload}`, () => {
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
      action({
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
      action({
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

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
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

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });

  it('skipped if `metadata.shouldSkipCd == true`', async () => {
    expect.hasAssertions();

    const action = (await isolatedImport(
      `../src/component-actions/${ComponentAction.VerifyNpm}`
    )) as ComponentActionFunction;

    mockMetadata.shouldSkipCd = true;

    await expect(action()).resolves.toBeUndefined();
    expect(mockedExeca).not.toBeCalled();
  });
});
