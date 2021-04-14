import { asMockedFunction } from './setup';
import execa from 'execa';
import cache from '@actions/cache';
import artifact from '@actions/artifact';
import core from '@actions/core';

jest.mock('execa');
// ? This weirdness due to these packages using strange TypeScript-only features
jest.mock('@actions/cache', () => jest.fn());
jest.mock('@actions/artifact', () => jest.fn());
jest.mock('@actions/core', () => jest.fn());

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
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

test.todo('me!');
