import fs, { CopyOptions } from 'fs-extra';
import path from 'path';
import sinon from 'sinon';
import { ImportMock, OtherManager } from 'ts-mock-imports';
import { expect } from 'chai';
import init from '../../src/lib/actions/init';
import migrationsDir from '../../src/lib/env/migrationsDir';
import config from '../../src/lib/env/config';

describe('init', () => {
  let mockManagerMigrationsDirShouldNotExist: OtherManager<() => Promise<void>>;
  let mockManagerConfigShouldNotExist: OtherManager<() => Promise<void>>;
  /* eslint-disable no-unused-vars */
  let mockManagerFsCopy: OtherManager<{ (src: string, dest: string, options?: CopyOptions):
    Promise<void>;(src: string, dest: string, callback: (err: Error) => void): void;
    (src: string, dest: string, options: CopyOptions, callback: (err: Error) => void): void; }>;
  let mockManagerFsMkdirs: OtherManager<{ (dir: string): Promise<void>;
    (dir: string, callback: (err: Error) => void): void; }>;
  /* eslint-enable no-unused-vars */

  beforeEach(() => {
    ImportMock.restore();
    mockManagerMigrationsDirShouldNotExist = ImportMock.mockOther(migrationsDir, 'shouldNotExist', sinon.stub().returns(Promise.resolve()));
    mockManagerConfigShouldNotExist = ImportMock.mockOther(config, 'shouldNotExist', sinon.stub().returns(Promise.resolve()));
    mockManagerFsCopy = ImportMock.mockOther(fs, 'copy', sinon.stub().returns(Promise.resolve()));
    mockManagerFsMkdirs = ImportMock.mockOther(fs, 'mkdirs', sinon.stub().returns(Promise.resolve()));
  });

  afterEach(() => {
    mockManagerMigrationsDirShouldNotExist.restore();
    mockManagerConfigShouldNotExist.restore();
    mockManagerFsCopy.restore();
    mockManagerFsMkdirs.restore();
  });

  it('should check if the migrations directory already exists', async () => {
    await init();
    expect((migrationsDir as any).shouldNotExist.called).to.equal(true);
  });

  it('should not continue and yield an error if the migrations directory already exists', async () => {
    (migrationsDir as any).shouldNotExist.returns(
      Promise.reject(new Error('Dir exists')),
    );
    try {
      await init();
    } catch (err) {
      expect(err.message).to.equal('Dir exists');
      expect((fs as any).copy.called).to.equal(false);
      expect((fs as any).mkdirs.called).to.equal(false);
    }
  });

  it('should check if the config file already exists', async () => {
    await init();
    expect((config as any).shouldNotExist.called).to.equal(true);
  });

  it('should not continue and yield an error if the config file already exists', async () => {
    (config as any).shouldNotExist.returns(
      Promise.resolve(new Error('Config exists')),
    );
    try {
      await init();
    } catch (err) {
      expect(err.message).to.equal('Config exists');
      expect((fs as any).copy.called).to.equal(false);
      expect((fs as any).mkdirs.called).to.equal(false);
    }
  });

  it('should copy the sample config file to the current working directory', async () => {
    await init();
    expect((fs as any).copy.called).to.equal(true);
    expect((fs as any).copy.callCount).to.equal(1);

    const source = (fs as any).copy.getCall(0).args[0];
    expect(source).to.equal(
      path.join(__dirname, '../../samples/migrate-ydb-config.js'),
    );

    const destination = (fs as any).copy.getCall(0).args[1];
    expect(destination).to.equal(
      path.join(process.cwd(), 'migrate-ydb-config.js'),
    );
  });

  it('should yield errors that occurred when copying the sample config', async () => {
    (fs as any).copy.returns(Promise.reject(new Error('No space left on device')));
    try {
      await init();
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('No space left on device');
    }
  });

  it('should create a migrations directory in the current working directory', async () => {
    await init();

    expect((fs as any).mkdirs.called).to.equal(true);
    expect((fs as any).mkdirs.callCount).to.equal(1);
    expect((fs as any).mkdirs.getCall(0).args[0]).to.deep.equal(
      path.join(process.cwd(), 'migrations'),
    );
  });

  it('should yield errors that occurred when creating the migrations directory', async () => {
    (fs as any).mkdirs.returns(Promise.reject(new Error('I cannot do that')));
    try {
      await init();
    } catch (err) {
      expect(err.message).to.equal('I cannot do that');
    }
  });
});
