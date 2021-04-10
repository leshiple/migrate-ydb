import fs from 'fs-extra';
import path from 'path';
import sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';
import { expect } from 'chai';
import config from '../../src/lib/env/config';

describe('config', () => {
  let mockManagerFsStat: any;

  function mockFsStat() {
    return sinon.stub();
  }

  beforeEach(() => {
    ImportMock.restore();
    mockManagerFsStat = ImportMock.mockOther(fs, 'stat', mockFsStat());
  });

  afterEach(() => {
    mockManagerFsStat.restore();
    config.set(null);
  });

  describe('shouldExist()', () => {
    it('should not yield an error when the config was set manually', async () => {
      (fs as any).stat.rejects();
      config.set({ my: 'config' });
      await config.shouldExist();
    });

    it('should not yield an error if the config exists', async () => {
      (fs as any).stat.returns(Promise.resolve());
      await config.shouldExist();
    });

    it('should yield an error if the config does not exist', async () => {
      const configPath = path.join(process.cwd(), 'migrate-ydb-config.js');
      (fs as any).stat.returns(Promise.reject(new Error('It does not exist')));
      try {
        await config.shouldExist();
        expect.fail('Error was not thrown');
      } catch (err) {
        expect(err.message).to.equal(
          `config file does not exist: ${configPath}`,
        );
      }
    });

    describe('shouldNotExist()', () => {
      it('should not yield an error when the config was set manually', async () => {
        (fs as any).stat.rejects();
        config.set({ my: 'config' });
        await config.shouldNotExist();
      });

      it('should not yield an error if the config does not exist', async () => {
        const error = new Error('File does not exist');
        error.name = 'ENOENT';
        (fs as any).stat.returns(Promise.reject(error));
        await config.shouldNotExist();
      });

      it('should yield an error if the config exists', async () => {
        const configPath = path.join(process.cwd(), 'migrate-ydb-config.js');
        (fs as any).stat.returns(Promise.resolve());
        try {
          await config.shouldNotExist();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.equal(
            `config file already exists: ${configPath}`,
          );
        }
      });
    });

    describe('getConfigFilename()', () => {
      it('should return the config file name', () => {
        expect(config.getConfigFilename()).to.equal(
          'migrate-ydb-config.js',
        );
      });
    });

    describe('read()', () => {
      it('should resolve with the custom config content when config content was set manually', async () => {
        const expected = { my: 'custom-config' };
        config.set(expected);
        const actual = await config.read();
        expect(actual).to.deep.equal(expected);
      });

      it('should attempt to read the config file', async () => {
        const configPath = path.join(process.cwd(), 'migrate-ydb-config.js');
        try {
          await config.read();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.match(new RegExp(`Cannot find module '${configPath}'`));
        }
      });

      it('should be possible to read a custom, absolute config file path', async () => {
        (global as any).options = { file: '/some/absoluete/path/to/a-config-file.js' };
        try {
          await config.read();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.match(
            new RegExp(`Cannot find module '${(global as any).options.file}'`),
          );
        }
      });

      it('should be possible to read a custom, relative config file path', async () => {
        (global as any).options = { file: './a/relative/path/to/a-config-file.js' };
        const configPath = path.join(process.cwd(), (global as any).options.file);
        try {
          await config.read();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.match(new RegExp(`Cannot find module '${configPath}'`));
        }
      });
    });
  });
});
