import { ComponentAction, invokeComponentAction, componentActions } from '../src/index';
import { asMockedFunction } from './setup';
import execa from 'execa';

jest.mock('execa');

const mockedExeca = asMockedFunction(execa);

beforeEach(() => {
  // TODO: mock global config fetch
  // TODO: add test-audit-level
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('::invokeComponentAction', () => {
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

    // it('fails if npm audit is unsuccessful', async () => {
    //   expect.hasAssertions();
    // });

    // it('respects pipeline config', async () => {
    //   expect.hasAssertions();
    // });

    // it('handles failure conditions gracefully', async () => {
    //   expect.hasAssertions();
    // });
  });
});
