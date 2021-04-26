import { asMockedFunction } from './setup';
import execa from 'execa';

// TODO: reimport rather than use static import of action script?

const mockedExeca = asMockedFunction(execa);

let mockContext: Record<string, unknown> = {};

jest.mock('execa');
jest.mock('@actions/github', () => ({ context: mockContext }));

beforeAll(() => {
  mockContext = {};
});

void mockedExeca;
test.todo('me!');
