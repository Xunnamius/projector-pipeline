import { ComponentAction, invokeComponentAction, componentActions } from '../src/index';
import { asMockedFunction } from './setup';
import execa from 'execa';
import cache from '@actions/cache';
import artifact from '@actions/artifact';
import core from '@actions/core';

jest.mock('execa');
// ? 4/2/2021: There's something weird about how the @action/X packages are
// ? compiled that makes them not play well with babel transpilation and the
// ? usual destructuring. I'm pretty sure it's the `import=`/`export=` syntax
jest.mock('@actions/cache', () => jest.fn());
jest.mock('@actions/artifact', () => jest.fn());
jest.mock('@actions/core', () => jest.fn());

const mockedExeca = asMockedFunction(execa);

mockedExeca.sync = jest.requireActual('execa').sync;
const mockedCache = (cache as unknown) as jest.Mock<typeof cache>;
const mockedCacheSaveCache = asMockedFunction<typeof cache['saveCache']>();
const mockedCacheRestoreCache = asMockedFunction<typeof cache['restoreCache']>();
const mockedArtifact = (artifact as unknown) as jest.Mock<typeof artifact>;
const mockedArtifactCreate = asMockedFunction<typeof artifact['create']>();
const mockedCore = (core as unknown) as jest.Mock<typeof core>;
const mockedCoreWarning = asMockedFunction<typeof core['warning']>();

mockedCache.mockImplementation(
  () =>
    (({
      saveCache: mockedCacheSaveCache,
      restoreCache: mockedCacheRestoreCache
    } as unknown) as typeof cache)
);

mockedArtifact.mockImplementation(
  () =>
    (({
      create: mockedArtifactCreate
    } as unknown) as typeof artifact)
);

mockedCore.mockImplementation(
  () =>
    (({
      warning: mockedCoreWarning
    } as unknown) as typeof core)
);

afterEach(() => {
  jest.clearAllMocks();
});

describe('::invokeComponentAction', () => {
  it('empty rejected promises handled correctly', async () => {
    expect.hasAssertions();

    const spy = jest
      .spyOn(componentActions, ComponentAction.MetadataCollect)
      .mockReturnValueOnce(({
        npmAuditFailLevel: 'test-audit-level'
      } as unknown) as ReturnType<typeof componentActions[ComponentAction.MetadataCollect]>);

    mockedExeca.mockReturnValueOnce(
      (Promise.reject() as unknown) as ReturnType<typeof mockedExeca>
    );

    await expect(invokeComponentAction(ComponentAction.Audit)).rejects.toMatchObject({
      message: 'audit component action invocation failed'
    });

    expect(mockedExeca).toBeCalled();
    spy.mockRestore();
  });

  it('returns new options object', async () => {
    expect.hasAssertions();

    const options = {};
    const spy = jest
      .spyOn(componentActions, ComponentAction.Audit)
      .mockReturnValueOnce(Promise.resolve());

    await expect(
      (await invokeComponentAction(ComponentAction.Audit, options)).options
    ).not.toBe(options);

    spy.mockRestore();
  });

  describe('action: audit', () => {
    it('succeeds if npm audit is successful', async () => {
      expect.hasAssertions();

      const spy = jest
        .spyOn(componentActions, ComponentAction.MetadataCollect)
        .mockReturnValueOnce(({
          npmAuditFailLevel: 'test-audit-level'
        } as unknown) as ReturnType<typeof componentActions[ComponentAction.MetadataCollect]>);

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
      );

      await expect(invokeComponentAction(ComponentAction.Audit)).resolves.toStrictEqual({
        action: ComponentAction.Audit,
        options: {},
        outputs: {}
      });

      expect(mockedExeca).toBeCalledWith(
        'npm',
        ['audit', '--audit-level=test-audit-level'],
        {
          stdio: 'inherit'
        }
      );

      spy.mockRestore();
    });

    it('fails if npm audit is unsuccessful', async () => {
      expect.hasAssertions();

      const spy = jest
        .spyOn(componentActions, ComponentAction.MetadataCollect)
        .mockReturnValueOnce(({
          npmAuditFailLevel: 'test-audit-level'
        } as unknown) as ReturnType<typeof componentActions[ComponentAction.MetadataCollect]>);

      mockedExeca.mockReturnValueOnce(
        (Promise.reject(new Error('fake error')) as unknown) as ReturnType<
          typeof mockedExeca
        >
      );

      await expect(invokeComponentAction(ComponentAction.Audit)).rejects.toMatchObject({
        message: expect.stringContaining(
          'audit component action invocation failed: fake error'
        )
      });

      expect(mockedExeca).toBeCalledWith(
        'npm',
        ['audit', '--audit-level=test-audit-level'],
        {
          stdio: 'inherit'
        }
      );

      spy.mockRestore();
    });
  });

  describe('action: build', () => {
    it('succeeds if build script is successful', async () => {
      expect.hasAssertions();

      const spy = jest
        .spyOn(componentActions, ComponentAction.MetadataCollect)
        .mockReturnValueOnce(({
          npmAuditFailLevel: 'test-audit-level'
        } as unknown) as ReturnType<typeof componentActions[ComponentAction.MetadataCollect]>);

      mockedExeca.mockReturnValueOnce(
        (Promise.resolve() as unknown) as ReturnType<typeof mockedExeca>
      );

      await expect(invokeComponentAction(ComponentAction.Audit)).resolves.toStrictEqual({
        action: ComponentAction.Audit,
        options: {},
        outputs: {}
      });

      expect(mockedExeca).toBeCalledWith('npm', ['run', 'format'], {
        stdio: 'inherit'
      });

      expect(mockedExeca).toBeCalledWith('npm', ['run', 'build-dist'], {
        stdio: 'inherit'
      });

      expect(mockedExeca).not.toBeCalledWith('npm', ['run', 'build-docs'], {
        stdio: 'inherit'
      });

      expect(mockedCoreWarning).toBeCalled();

      spy.mockRestore();
    });

    it('fails if npm audit is unsuccessful', async () => {
      expect.hasAssertions();

      const spy = jest
        .spyOn(componentActions, ComponentAction.MetadataCollect)
        .mockReturnValueOnce(({
          npmAuditFailLevel: 'test-audit-level'
        } as unknown) as ReturnType<typeof componentActions[ComponentAction.MetadataCollect]>);

      mockedExeca.mockReturnValueOnce(
        (Promise.reject(new Error('fake error')) as unknown) as ReturnType<
          typeof mockedExeca
        >
      );

      await expect(invokeComponentAction(ComponentAction.Audit)).rejects.toMatchObject({
        message: expect.stringContaining(
          'audit component action invocation failed: fake error'
        )
      });

      expect(mockedExeca).toBeCalledWith(
        'npm',
        ['audit', '--audit-level=test-audit-level'],
        {
          stdio: 'inherit'
        }
      );

      spy.mockRestore();
    });
  });
});
