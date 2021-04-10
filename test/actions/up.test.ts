// import fs, { CopyOptions } from 'fs-extra';
import sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';
import { expect } from 'chai';
import up from '../../src/lib/actions/up';
import status from '../../src/lib/actions/status';
import migrationsDir from '../../src/lib/env/migrationsDir';
import config from '../../src/lib/env/config';

describe('down', () => {
  let driver: any;
  let mockManagerMigrationsDirLoadMigration: any;
  let firstPendingMigration: any;
  let secondPendingMigration: any;
  let mockManagerStatus: any;
  let mockManagerConfigShouldExist: any;
  let mockManagerConfigRead: any;

  function mockStatus() {
    return sinon.stub().returns(
      Promise.resolve([
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
          appliedAt: 'PENDING',
        },
        {
          fileName: '2016_05_13_16-53-21-fourth_migration.js',
          fileHash: '3245987sh4kgjadsf5b83fa0c660d859082f0bb615e835d29943d26fb0d352022',
          appliedAt: 'PENDING',
        },
      ]),
    );
  }

  function mockMigration() {
    const theMigration = {
      up: sinon.stub(),
    };
    theMigration.up.returns(Promise.resolve());
    return theMigration;
  }

  function mockConfigShouldExist() {
    return sinon.stub().returns(Promise.resolve());
  }

  function mockConfigRead() {
    return sinon.stub().returns({ changelogCollectionName: 'changelog' });
  }

  function mockMigrationsDir() {
    const mock = sinon.stub();
    mock
      .withArgs('2016_05_13_15-53-21-third_migration.js')
      .returns(Promise.resolve(firstPendingMigration));
    mock
      .withArgs('2016_05_13_16-53-21-fourth_migration.js')
      .returns(Promise.resolve(secondPendingMigration));
    return mock;
  }

  function mockDriver() {
    return {
      destroy: sinon.stub().returns(Promise.resolve()),
      tableClient: {
        withSession: sinon.stub().returns(Promise.resolve()),
      },
    };
  }

  beforeEach(() => {
    ImportMock.restore();
    firstPendingMigration = mockMigration();
    secondPendingMigration = mockMigration();
    mockManagerMigrationsDirLoadMigration = ImportMock.mockOther(migrationsDir, 'loadMigration', mockMigrationsDir());
    mockManagerStatus = ImportMock.mockOther(status, 'get', mockStatus());
    mockManagerConfigShouldExist = ImportMock.mockOther(config, 'shouldExist', mockConfigShouldExist);
    mockManagerConfigRead = ImportMock.mockOther(config, 'read', mockConfigRead);
    driver = mockDriver();
  });

  afterEach(() => {
    driver = null;
    mockManagerMigrationsDirLoadMigration.restore();
    mockManagerStatus.restore();
    mockManagerConfigRead.restore();
    mockManagerConfigShouldExist.restore();
  });

  it('should fetch the status', async () => {
    await up(driver);
    expect((status as any).get.called).to.equal(true);
  });

  it('should load all the pending migrations', async () => {
    await up(driver);
    expect((migrationsDir as any).loadMigration.called).to.equal(true);
    expect((migrationsDir as any).loadMigration.callCount).to.equal(2);
    expect((migrationsDir as any).loadMigration.getCall(0).args[0]).to.equal(
      '2016_05_13_15-53-21-third_migration.js',
    );
    expect((migrationsDir as any).loadMigration.getCall(1).args[0]).to.equal(
      '2016_05_13_16-53-21-fourth_migration.js',
    );
  });

  it('should upgrade all pending migrations in ascending order', async () => {
    await up(driver);
    expect(firstPendingMigration.up.called).to.equal(true);
    expect(secondPendingMigration.up.called).to.equal(true);
    sinon.assert.callOrder(firstPendingMigration.up, secondPendingMigration.up);
  });

  it('should yield a list of upgraded migration file names', async () => {
    const upgradedFileNames = await up(driver);
    expect(upgradedFileNames).to.deep.equal([
      '2016_05_13_15-53-21-third_migration.js',
      '2016_05_13_16-53-21-fourth_migration.js',
    ]);
  });

  it('should stop migrating when an error occurred and yield the error', async () => {
    secondPendingMigration.up.returns(Promise.reject(new Error('Nope')));
    try {
      await up(driver);
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.deep.equal(
        'Could not migrate up 2016_05_13_16-53-21-fourth_migration.js: Nope',
      );
    }
  });
});
