import { ComponentAction, invokeComponentAction } from '../src/index';
import { promises as fs, constants as mode } from 'fs';

import type { RunnerContext } from '../types/global';

const mockedAction = jest.fn();
const mockedActionName = ('fake-component-action' as unknown) as ComponentAction;

jest.doMock(
  // ? Blame Node's module resolution algo lol
  `/repos/projector-pipeline/src/../src/component-actions/${mockedActionName}`,
  () => mockedAction,
  { virtual: true }
);

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

  mockedAction.mockReturnValueOnce(
    (Promise.resolve({ faker: true }) as unknown) as ReturnType<typeof mockedAction>
  );

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
    invokeComponentAction(mockedActionName, {} as RunnerContext)
  ).rejects.toMatchObject({
    message: `${mockedActionName} component action invocation failed: bad thing`
  });

  mockedAction.mockReturnValueOnce(Promise.reject(new Error('bad error')));

  await expect(
    invokeComponentAction(mockedActionName, {} as RunnerContext)
  ).rejects.toMatchObject({
    message: `${mockedActionName} component action invocation failed: bad error`
  });

  expect(mockedAction).toBeCalledTimes(2);
});

it('empty rejected promise handled correctly', async () => {
  expect.hasAssertions();

  mockedAction.mockReturnValueOnce(Promise.reject());

  await expect(
    invokeComponentAction(mockedActionName, {} as RunnerContext)
  ).rejects.toMatchObject({
    message: `${mockedActionName} component action invocation failed`
  });

  expect(mockedAction).toBeCalledTimes(1);
});

it('returns new options object', async () => {
  expect.hasAssertions();

  const options = {};
  mockedAction.mockReturnValueOnce(
    (Promise.resolve({ faker: true }) as unknown) as ReturnType<typeof mockedAction>
  );

  await expect(
    (await invokeComponentAction(mockedActionName, {} as RunnerContext, options)).options
  ).not.toBe(options);

  expect(mockedAction).toBeCalledTimes(1);
});
