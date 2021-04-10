import fs from 'fs-extra';
import path from 'path';
import sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';
import { expect } from 'chai';
import migrationsDir from '../../src/lib/env/migrationsDir';
import config from '../../src/lib/env/config';

describe('migrationsDir', () => {
  let mockManagerFsStat: any;
  let mockManagerFsReaddir: any;
  let mockManagerFsReadFile: any;
  let mockManagerConfigRead: any;

  function mockFs() {
    return sinon.stub();
  }

  function mockConfigRead() {
    return sinon.stub().returns({
      migrationsDir: 'migrations',
      migrationFileExtension: '.js',
    });
  }

  beforeEach(() => {
    ImportMock.restore();
    mockManagerFsStat = ImportMock.mockOther(fs, 'stat', mockFs());
    mockManagerFsReaddir = ImportMock.mockOther(fs, 'readdir', mockFs());
    mockManagerFsReadFile = ImportMock.mockOther(fs, 'readFile', mockFs());
    mockManagerConfigRead = ImportMock.mockOther(config, 'read', mockConfigRead());
  });

  afterEach(() => {
    mockManagerFsStat.restore();
    mockManagerFsReaddir.restore();
    mockManagerFsReadFile.restore();
    mockManagerConfigRead.restore();
  });

  describe('resolve()', () => {
    it('should use the configured relative migrations dir when a config file is available', async () => {
      (config as any).read.returns({
        migrationsDir: 'custom-migrations-dir',
      });
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), 'custom-migrations-dir'),
      );
    });

    it('should use the configured absolute migrations dir when a config file is available', async () => {
      (config as any).read.returns({
        migrationsDir: '/absolute/path/to/my/custom-migrations-dir',
      });
      expect(await migrationsDir.resolve()).to.equal(
        '/absolute/path/to/my/custom-migrations-dir',
      );
    });

    it('should use the default migrations directory when no migrationsDir is specified in the config file', async () => {
      (config as any).read.returns({});
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), 'migrations'),
      );
    });

    it('should use the default migrations directory when unable to read the config file', async () => {
      (config as any).read.throws(new Error('Cannot read config file'));
      expect(await migrationsDir.resolve()).to.equal(
        path.join(process.cwd(), 'migrations'),
      );
    });

    describe('shouldExist()', () => {
      it('should not reject with an error if the migrations dir exists', async () => {
        (fs as any).stat.returns(Promise.resolve());
        await migrationsDir.shouldExist();
      });

      it('should yield an error if the migrations dir does not exist', async () => {
        const migrationsPath = path.join(process.cwd(), 'migrations');
        (fs as any).stat.returns(Promise.reject(new Error('It does not exist')));
        try {
          await migrationsDir.shouldExist();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.equal(
            `migrations directory does not exist: ${migrationsPath}`,
          );
        }
      });
    });

    describe('shouldNotExist()', () => {
      it('should not yield an error if the migrations dir does not exist', async () => {
        const error = new Error('File does not exist');
        (error as any).code = 'ENOENT';
        (fs as any).stat.returns(Promise.reject(error));
        await migrationsDir.shouldNotExist();
      });

      it('should yield an error if the migrations dir exists', async () => {
        const migrationsPath = path.join(process.cwd(), 'migrations');
        (fs as any).stat.returns(Promise.resolve());
        try {
          await migrationsDir.shouldNotExist();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.equal(
            `migrations directory already exists: ${migrationsPath}`,
          );
        }
      });
    });

    describe('getFileNames()', () => {
      it('should read the directory and yield the result', async () => {
        (fs as any).readdir.returns(Promise.resolve(['file1.js', 'file2.js']));
        const files = await migrationsDir.getFileNames();
        expect(files).to.deep.equal(['file1.js', 'file2.js']);
      });

      it('should list only files with configured extension', async () => {
        (config as any).read.returns({
          migrationFileExtension: '.ts',
        });
        (fs as any).readdir.returns(Promise.resolve(['file1.ts', 'file2.ts', 'file1.js', 'file2.js', '.keep']));
        const files = await migrationsDir.getFileNames();
        expect(files).to.deep.equal(['file1.ts', 'file2.ts']);
      });

      it('should yield errors that occurred while reading the dir', async () => {
        (fs as any).readdir.returns(Promise.reject(new Error('Could not read')));
        try {
          await migrationsDir.getFileNames();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.equal('Could not read');
        }
      });

      it('should be sorted in alphabetical order', async () => {
        (fs as any).readdir.returns(Promise.resolve([
          '2020_10_14_17-23-43-test.js',
          '2020_10_14_17-23-56-test3.js',
          '2020_10_14_17-23-54-test2.js',
          '2020_10_14_17-23-45-test1.js',
        ]));
        const files = await migrationsDir.getFileNames();
        expect(files).to.deep.equal([
          '2020_10_14_17-23-43-test.js',
          '2020_10_14_17-23-45-test1.js',
          '2020_10_14_17-23-54-test2.js',
          '2020_10_14_17-23-56-test3.js',
        ]);
      });
    });

    describe('loadMigration()', () => {
      it('should attempt to load the fileName in the migrations directory', async () => {
        const pathToMigration = path.join(
          process.cwd(),
          'migrations',
          'someFile.js',
        );
        try {
          await migrationsDir.loadMigration('someFile.js');
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.match(new RegExp(`Cannot find module '${pathToMigration}'`));
        }
      });
    });

    describe('resolveMigrationFileExtension()', () => {
      it('should provide the value if specified', async () => {
        (config as any).read.returns({
          migrationFileExtension: '.ts',
        });
        const ext = await migrationsDir.resolveMigrationFileExtension();
        expect(ext).to.equal('.ts');
      });
      it('should error if the extension does not start with dot', async () => {
        (config as any).read.returns({
          migrationFileExtension: 'js',
        });
        try {
          await migrationsDir.resolveMigrationFileExtension();
          expect.fail('Error was not thrown');
        } catch (err) {
          expect(err.message).to.equal('migrationFileExtension must start with dot');
        }
      });
      it('should use the default if not specified', async () => {
        (config as any).read.returns({
          migrationFileExtension: undefined,
        });
        const ext = await migrationsDir.resolveMigrationFileExtension();
        expect(ext).to.equal('.js');
      });
      it('should use the default if config file not found', async () => {
        (config as any).read.throws();
        const ext = await migrationsDir.resolveMigrationFileExtension();
        expect(ext).to.equal('.js');
      });
    });

    describe('doesSampleMigrationExist()', () => {
      it('should return true if sample migration exists', async () => {
        (fs as any).stat.returns(Promise.resolve());
        const result = await migrationsDir.doesSampleMigrationExist();
        expect(result).to.equal(true);
      });

      it("should return false if sample migration doesn't exists", async () => {
        (fs as any).stat.returns(Promise.reject(new Error('It does not exist')));
        const result = await migrationsDir.doesSampleMigrationExist();
        expect(result).to.equal(false);
      });
    });

    describe('loadFileHash()', () => {
      it('should return a hash based on the file contents', async () => {
        (fs as any).readFile.returns(Promise.resolve('some string to hash'));
        const result = await migrationsDir.loadFileHash('somefile.js');
        expect(result).to.equal('ea83a45637a9af470a994d2c9722273ef07d47aec0660a1d10afe6e9586801ac');
      });
    });
  });
});
