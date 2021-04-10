import _ from 'lodash';
import pEachSeries from 'p-each-series';
import { Driver, Session } from 'ydb-sdk';
import date from '../utils/date';
import Migration from '../schemas/migration';
import status from './status';
import config from '../env/config';
import migrationsDir from '../env/migrationsDir';

const SYNTAX_V1 = '--!syntax_v1';

export default async (driver:Driver) => {
  const { migrationsTable } = await config.read();
  const statusItems = await status.get(driver);
  const pendingItems = _.filter(statusItems, { appliedAt: 'PENDING' });
  const migrated:string[] = [];
  const migrations: Migration[] = [];

  const migrateItem = async (item:any) => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);

      await migration.up(driver);
    } catch (err) {
      const error = new Error(
        `Could not migrate up ${item.fileName}: ${err.message}`,
      );
      error.stack = err.stack;
      throw error;
    }

    const { fileName, fileHash } = item;
    const appliedAt = date.nowAsString();

    migrations.push(Migration.create(
      fileName,
      fileHash,
      appliedAt,
    ));

    migrated.push(item.fileName);
  };

  await pEachSeries(pendingItems, migrateItem);

  try {
    await driver.tableClient.withSession(async (session: Session) => {
      const query = `
        ${SYNTAX_V1}
        DECLARE $migrationData AS List<Struct<
          file_name: Utf8,
          file_hash: Utf8,
          applied_at: Utf8>>;

        INSERT INTO ${migrationsTable}
        SELECT
          *
        FROM AS_TABLE($migrationData);
      `;

      const preparedQuery = await session.prepareQuery(query);
      await session.executeQuery(preparedQuery, {
        $migrationData: Migration.asTypedCollection(migrations),
      });
    });
  } catch (err) {
    throw new Error(`Could not update changelog: ${err.message}`);
  }

  return migrated;
};
