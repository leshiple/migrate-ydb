import pEachSeries from 'p-each-series';
import { Driver, Session } from 'ydb-sdk';
import status from './status';
import config from '../env/config';
import migrationsDir from '../env/migrationsDir';

const SYNTAX_V1 = '--!syntax_v1';

export default async (driver: Driver, options: any) => {
  const step = options?.step || 1;
  const isNotValidStep = (Number.isNaN(step) && step !== 'all') || step <= 0;

  if (isNotValidStep) {
    throw new Error('option --step expectend positive number or string \'all\'');
  }

  const downgraded: string[] = [];
  const { migrationsTable } = await config.read();
  const statusItems = await status(driver);

  let end;

  if (step !== 'all') {
    end = step;
  }
  const appliedItems = statusItems
    .filter((item) => item.appliedAt !== 'PENDING')
    .sort((a, b) => (a.fileName >= b.fileName ? -1 : 1))
    .slice(0, end);

  const migrateItem = async (item:any) => {
    try {
      const migration = await migrationsDir.loadMigration(item.fileName);

      await migration.down(driver);
    } catch (err) {
      const error = new Error(
        `Could not migrate down ${item.fileName}: ${err.message}`,
      );
      error.stack = err.stack;
      throw error;
    }

    downgraded.push(item.fileName);
  };

  await pEachSeries(appliedItems, migrateItem);

  const toDelete = downgraded
    .map((i) => `"${i}"`)
    .join(',');

  try {
    await driver.tableClient.withSession(async (session: Session) => {
      const query = `
        ${SYNTAX_V1}
        DELETE from ${migrationsTable}
        WHERE file_name IN (${toDelete})
      `;
      await session.executeQuery(query);
    });
  } catch (err) {
    throw new Error(`Could not update changelog: ${err.message}`);
  }

  return downgraded;
};
