import fs from 'fs-extra';
import path from 'path';
import migrationsDir from '../env/migrationsDir';
import config from '../env/config';

function copySampleConfigFile() {
  const source = path.join(__dirname, '../../../samples/migrate-ydb-config.js');
  const destination = path.join(
    process.cwd(),
    config.DEFAULT_CONFIG_FILE_NAME,
  );
  return fs.copy(source, destination);
}

function createMigrationsDirectory() {
  return fs.mkdirs(path.join(process.cwd(), 'migrations'));
}

export default async () => {
  await migrationsDir.shouldNotExist();
  await config.shouldNotExist();
  await copySampleConfigFile();
  return createMigrationsDirectory();
};
