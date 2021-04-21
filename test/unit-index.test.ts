import { ComponentAction, invokeComponentAction } from '../src/index';
import { asMockedFunction } from './setup';
import { promises as fs, constants as mode } from 'fs';
import mockAction from '../src/component-actions/audit';
import execa from 'execa';

import type { RunnerContext } from '../types/global';

jest.mock('execa');
jest.mock('../src/component-actions/audit');

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

const mockedAction = asMockedFunction(mockAction);
const mockedActionName = ComponentAction.Audit;

afterEach(() => {
  jest.clearAllMocks();
});

it('all ComponentActions refer to files under `src/component-actions`', async () => {
  expect.hasAssertions();

  await Promise.all(
    Object.values(ComponentAction).map((path) =>
      expect(
        fs.access(`${__dirname}/../src/component-actions/${path}.ts`, mode.R_OK)
      ).resolves.toBeUndefined()
    )
  );
});

it('capable of invoking component actions', async () => {
  expect.hasAssertions();

  // @ts-expect-error: we don't care that the dummy return value isn't valid
  mockedAction.mockReturnValueOnce(Promise.resolve({ faker: true }));

  await expect(
    invokeComponentAction(mockedActionName, {} as RunnerContext)
  ).resolves.toStrictEqual({
    action: mockedActionName,
    options: expect.anything(),
    outputs: { faker: true }
  });

  mockedAction.mockReturnValueOnce(Promise.resolve());

  await expect(
    invokeComponentAction(mockedActionName, {} as RunnerContext)
  ).resolves.toStrictEqual({
    action: mockedActionName,
    options: expect.anything(),
    outputs: {}
  });

  expect(mockedAction).toBeCalledTimes(2);
});

it('rejected promise handled correctly', async () => {
  expect.hasAssertions();

  mockedAction.mockReturnValueOnce(Promise.reject('bad thing'));

  await expect(
    invokeComponentAction(ComponentAction.Audit, {} as RunnerContext)
  ).rejects.toMatchObject({
    message: `${ComponentAction.Audit} component action invocation failed: bad thing`
  });

  mockedAction.mockReturnValueOnce(Promise.reject(new Error('bad error')));

  await expect(
    invokeComponentAction(ComponentAction.Audit, {} as RunnerContext)
  ).rejects.toMatchObject({
    message: `${ComponentAction.Audit} component action invocation failed: bad error`
  });

  expect(mockedAction).toBeCalledTimes(2);
});

it('empty rejected promise handled correctly', async () => {
  expect.hasAssertions();

  mockedAction.mockReturnValueOnce(Promise.reject());

  await expect(
    invokeComponentAction(ComponentAction.Audit, {} as RunnerContext)
  ).rejects.toMatchObject({
    message: `${ComponentAction.Audit} component action invocation failed`
  });

  expect(mockedAction).toBeCalledTimes(1);
});

it('returns new options object', async () => {
  expect.hasAssertions();

  const options = {};
  // @ts-expect-error: we don't care that the dummy return value isn't valid
  mockedAction.mockReturnValueOnce(Promise.resolve({ faker: true }));

  await expect(
    (await invokeComponentAction(ComponentAction.Audit, {} as RunnerContext, options))
      .options
  ).not.toBe(options);

  expect(mockedAction).toBeCalledTimes(1);
});
