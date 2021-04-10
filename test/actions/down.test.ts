// import fs, { CopyOptions } from 'fs-extra';
import sinon from 'sinon';
import { ImportMock } from 'ts-mock-imports';
import { expect } from 'chai';
import down from '../../src/lib/actions/down';
import status from '../../src/lib/actions/status';
import migrationsDir from '../../src/lib/env/migrationsDir';
import config from '../../src/lib/env/config';

describe('down', () => {
  // let status: any;
  let migration: any;
  // let config: any;
  let driver: any;
  let mockManagerMigrationsDirLoadMigration: any;
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
          fileName: '2016_05_09_11-32-24-last_migration.js',
          fileHash: '0f295f21f63c66dc78d8dc091ce3c8bab8c56d8b74fb35a0c99f6d9953e37d1a',
          appliedAt: '2016_05_09_11-32-24',
        },
      ]),
    );
  }

  function mockMigration() {
    const theMigration = {
      down: sinon.stub(),
    };
    theMigration.down.returns(Promise.resolve());
    return theMigration;
  }

  function mockConfigShouldExist() {
    return sinon.stub().returns(Promise.resolve());
  }

  function mockConfigRead() {
    return sinon.stub().returns({ changelogCollectionName: 'changelog' });
  }

  function mockMigrationsDir() {
    return sinon.stub().returns(Promise.resolve(migration));
  }

  function mockDriver() {
    return {
      destroy: sinon.stub().returns(Promise.resolve()),
      tableClient: {
        withSession: sinon.stub().returns(Promise.resolve([
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
        ])),
      },
    };
  }

  beforeEach(() => {
    ImportMock.restore();
    migration = mockMigration();
    mockManagerMigrationsDirLoadMigration = ImportMock.mockOther(migrationsDir, 'loadMigration', mockMigrationsDir());
    mockManagerStatus = ImportMock.mockOther(status, 'get', mockStatus());
    mockManagerConfigShouldExist = ImportMock.mockOther(config, 'shouldExist', mockConfigShouldExist);
    mockManagerConfigRead = ImportMock.mockOther(config, 'read', mockConfigRead);
    driver = mockDriver();
  });

  afterEach(() => {
    migration = null;
    driver = null;
    mockManagerMigrationsDirLoadMigration.restore();
    mockManagerStatus.restore();
    mockManagerConfigRead.restore();
    mockManagerConfigShouldExist.restore();
  });

  it('should fetch the status', async () => {
    await down(driver, {});
    expect((status as any).get.called).to.equal(true);
  });

  it('should yield empty list when nothing to downgrade', async () => {
    (status as any).get.returns(
      Promise.resolve([
        { fileName: '2016_06_09_11-32-24-some_migration.js', appliedAt: 'PENDING' },
      ]),
    );
    const migrated = await down(driver, {});
    expect(migrated).to.deep.equal([]);
  });

  it('should load the last applied migration', async () => {
    await down(driver, {});
    expect((migrationsDir as any).loadMigration.getCall(0).args[0]).to.equal(
      '2016_05_09_11-32-24-last_migration.js',
    );
  });

  it('should downgrade the last applied migration', async () => {
    await down(driver, {});
    expect(migration.down.called).to.equal(true);
  });

  it('should yield an error when the option step pass negative number', async () => {
    try {
      await down(driver, { step: -1 });
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('option --step expectend positive number or string "all"');
    }
  });

  it('should yield an error when the option step pass incorrect string', async () => {
    try {
      await down(driver, { step: 'fake' });
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal('option --step expectend positive number or string "all"');
    }
  });

  it('should yield a list of all migrations items when the option step pass "all" ', async () => {
    const items = await down(driver, { step: 'all' });
    expect(items).to.deep.equal([
      '2016_05_09_11-32-24-last_migration.js',
      '2016_05_09_11-32-24-first_migration.js',
    ]);
  });

  it('should yield an error when an error occurred during the downgrade', async () => {
    migration.down.returns(Promise.reject(new Error('Invalid syntax')));
    try {
      await down(driver, {});
      expect.fail('Error was not thrown');
    } catch (err) {
      expect(err.message).to.equal(
        'Could not migrate down 2016_05_09_11-32-24-last_migration.js: Invalid syntax',
      );
    }
  });

  it('should yield a list of downgraded items', async () => {
    const items = await down(driver, {});
    expect(items).to.deep.equal(['2016_05_09_11-32-24-last_migration.js']);
  });
});
