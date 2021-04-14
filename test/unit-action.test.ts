import { asMockedFunction } from './setup';
import execa from 'execa';

jest.mock('execa');

const mockedExeca = asMockedFunction(execa);
// TODO: retire this line when .changelogrc.js is fixed
mockedExeca.sync = jest.requireActual('execa').sync;

test.todo('me!');
