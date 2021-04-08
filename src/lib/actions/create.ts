import fs from "fs-extra";
import path from "path";
import date from "../utils/date";
import migrationsDir from "../env/migrationsDir";

module.exports = async (description: string) => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await migrationsDir.shouldExist();
  const migrationsDirPath = await migrationsDir.resolve();
  const migrationExtension = await migrationsDir.resolveMigrationFileExtension();

  // Check if there is a 'sample-migration.js' file in migrations dir - if there is, use that
  let source;
  console.log('1=', await migrationsDir.doesSampleMigrationExist());
  if (await migrationsDir.doesSampleMigrationExist()) {
    source = await migrationsDir.resolveSampleMigrationPath();
  } else {
    source = path.join(__dirname, "../../../samples/migration.js");
  }

  const filename = `${date.nowAsString()}-${description
    .split(" ")
    .join("_")}${migrationExtension}`;
  const destination = path.join(migrationsDirPath, filename);
  await fs.copy(source, destination);
  return filename;
};
