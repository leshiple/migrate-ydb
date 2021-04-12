import {
  Driver,
  Session,
  Column,
  TableDescription,
  Ydb,
} from 'ydb-sdk';

import { find } from 'lodash';
import Migration from '../schemas/migration';
import migrationsDir from '../env/migrationsDir';
import config from '../env/config';

const SYNTAX_V1 = '--!syntax_v1';

export default {
  async get(driver: Driver) {
    await migrationsDir.shouldExist();
    await config.shouldExist();
    const fileNames = await migrationsDir.getFileNames();

    const { migrationsTable } = await config.read();

    const migrations = await driver.tableClient.withSession(async (session: Session) => {
    // Create table
      await session.createTable(
        migrationsTable,
        new TableDescription()
          .withColumn(new Column(
            'file_name',
            Ydb.Type.create({ optionalType: { item: { typeId: Ydb.Type.PrimitiveTypeId.UTF8 } } }),
          ))
          .withColumn(new Column(
            'file_hash',
            Ydb.Type.create({ optionalType: { item: { typeId: Ydb.Type.PrimitiveTypeId.UTF8 } } }),
          ))
          .withColumn(new Column(
            'applied_at',
            Ydb.Type.create({ optionalType: { item: { typeId: Ydb.Type.PrimitiveTypeId.UTF8 } } }),
          ))
          .withPrimaryKey('file_name'),
      );

      const query = `
      ${SYNTAX_V1}
      SELECT * FROM ${migrationsTable}
    `;
      const { resultSets } = await session.executeQuery(query);
      return Migration.createNativeObjects(resultSets[0]);
    });

    const statusTable = await Promise.all(fileNames.map(async (fileName) => {
      const fileHash = await migrationsDir.loadFileHash(fileName);
      const itemInLog = find(migrations, { fileName, fileHash });
      const appliedAt = itemInLog ? itemInLog.appliedAt : 'PENDING';

      return { fileName, fileHash, appliedAt };
    }));

    await driver.destroy();

    return statusTable;
  },
};
