import { asMockedFunction } from './setup';
import execa from 'execa';

// TODO: reimport rather than use static import of action script

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

let mockContext: Record<string, unknown> = {};

jest.mock('execa');
jest.mock('@actions/github', () => ({ context: mockContext }));

beforeAll(() => {
  mockContext = {};
});

test.todo('me!');
