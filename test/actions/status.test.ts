import fs, { CopyOptions } from 'fs-extra';
// import path from 'path';
import sinon from 'sinon';
import { ImportMock, OtherManager } from 'ts-mock-imports';
import { expect } from 'chai';
import status from '../../src/lib/actions/status';
import migrationsDir from '../../src/lib/env/migrationsDir';
import config from '../../src/lib/env/config';

describe('status', () => {
  let mockManagerMigrationsDirShouldExist: OtherManager<() => Promise<void>>;
  let mockManagerMigrationsDirGetFileNames: OtherManager<() => Promise<string[]>>;
  // eslint-disable-next-line no-unused-vars
  let mockManagerMigrationsDirLoadFileHash: OtherManager<(fileName: string) => Promise<string>>;
  let mockManagerConfigShouldExist: OtherManager<() => Promise<void>>;
  let mockManagerConfigRead: OtherManager<() => Promise<void>>;
  /* eslint-disable no-unused-vars */
  let mockManagerFsCopy: OtherManager<{ (src: string, dest: string, options?: CopyOptions):
    Promise<void>;(src: string, dest: string, callback: (err: Error) => void): void;
    (src: string, dest: string, options: CopyOptions, callback: (err: Error) => void): void; }>;
  /* eslint-enable no-unused-vars */
  let mockManagerFsReadFile: any;
  let driver: any = {
    tableClient: {},
  };

  beforeEach(() => {
    ImportMock.restore();
    mockManagerMigrationsDirShouldExist = ImportMock.mockOther(migrationsDir, 'shouldExist', sinon.stub().returns(Promise.resolve()));
    mockManagerMigrationsDirGetFileNames = ImportMock.mockOther(migrationsDir, 'getFileNames', sinon
      .stub()
      .returns(
        Promise.resolve([
          '2016_05_09_11-32-24-first_migration.js',
          '2016_05_12_09-17-01-second_migration.js',
          '2016_05_13_15-53-21-third_migration.js',
        ]),
      ));
    mockManagerMigrationsDirLoadFileHash = ImportMock.mockOther(migrationsDir, 'loadFileHash', sinon
      .stub()
      .callsFake((fileName) => {
        switch (fileName) {
          case '2016_05_09_11-32-24-first_migration.js':
            return Promise.resolve('0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a');
          case '2016_05_12_09-17-01-second_migration.js':
            return Promise.resolve('18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70');
          case '2016_05_13_15-53-21-third_migration.js':
            return Promise.resolve('1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022');
          default:
            return Promise.resolve();
        }
      }));
    mockManagerConfigShouldExist = ImportMock.mockOther(config, 'shouldExist', sinon.stub().returns(Promise.resolve()));
    mockManagerConfigRead = ImportMock.mockOther(config, 'read', sinon.stub().returns({
      migrationsTable: 'migrations',
    }));
    mockManagerFsCopy = ImportMock.mockOther(fs, 'copy', sinon.stub().returns(Promise.resolve()));
    mockManagerFsReadFile = ImportMock.mockOther(fs, 'readFile', sinon.stub().returns(Promise.resolve('some file content')));
    driver.tableClient.withSession = sinon.stub().returns(Promise.resolve([
      {
        fileName: '2016_05_09_11-32-24-first_migration.js',
        fileHash: '0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a',
        appliedAt: '2016_05_09_11-32-24',
      },
      {
        fileName: '2016_05_12_09-17-01-second_migration.js',
        fileHash: '18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70',
        appliedAt: '2016_05_13_14-45-24',
      },
      {
        fileName: '2016_05_13_15-53-21-third_migration.js',
        fileHash: '1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022',
        appliedAt: '2016_05_21_10-15-24',
      },
    ]));
    driver.destroy = sinon.stub().returns(Promise.resolve());
  });

  afterEach(() => {
    mockManagerMigrationsDirShouldExist.restore();
    mockManagerMigrationsDirGetFileNames.restore();
    mockManagerMigrationsDirLoadFileHash.restore();
    mockManagerConfigShouldExist.restore();
    mockManagerConfigRead.restore();
    mockManagerFsCopy.restore();
    mockManagerFsReadFile.restore();
    driver = {
      tableClient: {},
    };
  });

  it('should check that the migrations directory exists', async () => {
    await status(driver);
    expect((migrationsDir as any).shouldExist.called).to.equal(true);
  });

  it('should yield an error when the migrations directory does not exist', async () => {
    (migrationsDir as any).shouldExist.returns(
      Promise.reject(new Error('migrations directory does not exist')),
    );
    try {
      await status(driver);
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('migrations directory does not exist');
    }
  });

  it('should check that the config file exists', async () => {
    await status(driver);
    expect((config as any).shouldExist.called).to.equal(true);
  });

  it('should yield an error when config file does not exist', async () => {
    (config as any).shouldExist.returns(
      Promise.reject(new Error('config file does not exist')),
    );
    try {
      await status(driver);
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('config file does not exist');
    }
  });

  it('should get the list of files in the migrations directory', async () => {
    await status(driver);
    expect((migrationsDir as any).getFileNames.called).to.equal(true);
  });

  it('should yield errors that occurred when getting the list of files in the migrations directory', async () => {
    (migrationsDir as any).getFileNames.returns(
      Promise.reject(new Error('File system unavailable')),
    );
    try {
      await status(driver);
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('File system unavailable');
    }
  });

  it('should yield an array that indicates the status of the migrations in the directory', async () => {
    const statusItems = await status(driver);
    expect(statusItems).to.deep.equal([
      {
        fileName: '2016_05_09_11-32-24-first_migration.js',
        fileHash: '0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a',
        appliedAt: '2016_05_09_11-32-24',
      },
      {
        fileName: '2016_05_12_09-17-01-second_migration.js',
        fileHash: '18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff70',
        appliedAt: '2016_05_13_14-45-24',
      },
      {
        fileName: '2016_05_13_15-53-21-third_migration.js',
        fileHash: '1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022',
        appliedAt: '2016_05_21_10-15-24',
      },
    ]);
  });

  it('it should mark changed scripts with pending', async () => {
    (migrationsDir as any).loadFileHash.callsFake((fileName: string) => {
      switch (fileName) {
        case '2016_05_09_11-32-24-first_migration.js':
          return Promise.resolve('0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a');
        case '2016_05_12_09-17-01-second_migration.js':
          return Promise.resolve('18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff71');
        case '2016_05_13_15-53-21-third_migration.js':
          return Promise.resolve('1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022');
        default:
          return Promise.resolve();
      }
    });

    const statusItems = await status(driver);
    expect(statusItems).to.deep.equal([
      {
        appliedAt: '2016_05_09_11-32-24',
        fileName: '2016_05_09_11-32-24-first_migration.js',
        fileHash: '0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a',
      },
      {
        appliedAt: 'PENDING',
        fileName: '2016_05_12_09-17-01-second_migration.js',
        fileHash: '18b4d9c95a8678ae3a6dd3ae5b8961737a6c3dd65e3e655a5f5718d97a0bff71', // this hash is different
      },
      {
        appliedAt: '2016_05_21_10-15-24',
        fileName: '2016_05_13_15-53-21-third_migration.js',
        fileHash: '1f9eb3b5eb70b2fb5b83fa0c660d859082f0bb615e835d29943d26fb0d352022',
      },
    ]);
  });
});
