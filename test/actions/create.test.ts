import fs, { CopyOptions } from 'fs-extra';
import path from 'path';
import sinon from 'sinon';
import { ImportMock, OtherManager } from 'ts-mock-imports';
import { expect } from 'chai';
import create from '../../src/lib/actions/create';
import migrationsDir from '../../src/lib/env/migrationsDir';
import config from '../../src/lib/env/config';

describe('create', () => {
  let mockManagerMigrationsDirShouldExist: OtherManager<() => Promise<void>>;
  let mockManagerMigrationsDirResolveMigrationFileExtension: OtherManager<() => Promise<void>>;
  let mockManagerMigrationsDirDoesSampleMigrationExist: OtherManager<() => Promise<boolean>>;
  let mockManagerConfigShouldExist: OtherManager<() => Promise<void>>;
  /* eslint-disable no-unused-vars */
  let mockManagerFsCopy: OtherManager<{ (src: string, dest: string, options?: CopyOptions):
    Promise<void>;(src: string, dest: string, callback: (err: Error) => void): void;
    (src: string, dest: string, options: CopyOptions, callback: (err: Error) => void): void; }>;
  /* eslint-enable no-unused-vars */

  beforeEach(() => {
    ImportMock.restore();
    mockManagerMigrationsDirShouldExist = ImportMock.mockOther(migrationsDir, 'shouldExist', sinon.stub().returns(Promise.resolve()));
    mockManagerMigrationsDirResolveMigrationFileExtension = ImportMock.mockOther(migrationsDir, 'resolveMigrationFileExtension', sinon.stub().returns('.js'));
    mockManagerMigrationsDirDoesSampleMigrationExist = ImportMock.mockOther(migrationsDir, 'doesSampleMigrationExist', sinon.stub().returns(Promise.resolve(false)));
    mockManagerConfigShouldExist = ImportMock.mockOther(config, 'shouldExist', sinon.stub().returns(Promise.resolve()));
    mockManagerFsCopy = ImportMock.mockOther(fs, 'copy', sinon.stub().returns(Promise.resolve()));
  });

  afterEach(() => {
    mockManagerMigrationsDirShouldExist.restore();
    mockManagerMigrationsDirResolveMigrationFileExtension.restore();
    mockManagerMigrationsDirDoesSampleMigrationExist.restore();
    mockManagerConfigShouldExist.restore();
    mockManagerFsCopy.restore();
  });

  it('should yield an error when called without a description', async () => {
    try {
      await create('');
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('Missing parameter: description');
    }
  });

  it('should check that the migrations directory exists', async () => {
    await create('my_description');
    expect((migrationsDir as any).shouldExist.called).to.equal(true);
  });

  it('should yield an error when the migrations directory does not exist', async () => {
    (migrationsDir as any).shouldExist.returns(
      Promise.reject(new Error('migrations directory does not exist')),
    );
    try {
      await create('my_description');
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('migrations directory does not exist');
    }
  });

  it('should not be necessary to have an config present', async () => {
    await create('my_description');
    expect((config as any).shouldExist.called).to.equal(false);
  });

  it('should create a new migration file and yield the filename', async () => {
    const clock = sinon.useFakeTimers(
      new Date('2016-06-09T08:07:00.077Z').getTime(),
    );
    const filename = await create('my_description');
    expect((fs as any).copy.called).to.equal(true);
    expect((fs as any).copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, '../../samples/migration.js'),
    );
    expect((fs as any).copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), 'migrations', '2016_06_09_08-07-00-my_description.js'),
    );
    expect(filename).to.equal('2016_06_09_08-07-00-my_description.js');
    clock.restore();
  });

  it('should create a new migration file and yield the filename with custom extension', async () => {
    const clock = sinon.useFakeTimers(
      new Date('2016-06-09T08:07:00.077Z').getTime(),
    );
    (migrationsDir as any).resolveMigrationFileExtension.returns('.ts');
    const filename = await create('my_description');
    expect((fs as any).copy.called).to.equal(true);
    expect((fs as any).copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, '../../samples/migration.js'),
    );
    expect((fs as any).copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), 'migrations', '2016_06_09_08-07-00-my_description.ts'),
    );
    expect(filename).to.equal('2016_06_09_08-07-00-my_description.ts');
    clock.restore();
  });

  it('should replace spaces in the description with underscores', async () => {
    const clock = sinon.useFakeTimers(
      new Date('2016-06-09T08:07:00.077Z').getTime(),
    );
    await create('this description contains spaces');
    expect((fs as any).copy.called).to.equal(true);
    expect((fs as any).copy.getCall(0).args[0]).to.equal(
      path.join(__dirname, '../../samples/migration.js'),
    );
    expect((fs as any).copy.getCall(0).args[1]).to.equal(
      path.join(
        process.cwd(),
        'migrations',
        '2016_06_09_08-07-00-this_description_contains_spaces.js',
      ),
    );
    clock.restore();
  });

  it('should yield errors that occurred when copying the file', async () => {
    (fs as any).copy.returns(Promise.reject(new Error('Copy failed')));
    try {
      await create('my_description');
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('Copy failed');
    }
  });

  it('should use the sample migration file if it exists', async () => {
    const clock = sinon.useFakeTimers(
      new Date('2016-06-09T08:07:00.077Z').getTime(),
    );
    (migrationsDir as any).doesSampleMigrationExist.returns(true);
    const filename = await create('my_description');
    expect((migrationsDir as any).doesSampleMigrationExist.called).to.equal(true);
    expect((fs as any).copy.called).to.equal(true);
    expect((fs as any).copy.getCall(0).args[0]).to.equal(
      path.join(process.cwd(), 'migrations', 'sample-migration.js'),
    );
    expect((fs as any).copy.getCall(0).args[1]).to.equal(
      path.join(process.cwd(), 'migrations', '2016_06_09_08-07-00-my_description.js'),
    );
    expect(filename).to.equal('2016_06_09_08-07-00-my_description.js');
    clock.restore();
  });
});
