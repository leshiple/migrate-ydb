#! /usr/bin/env node

import program from 'commander';
import Table from 'cli-table3';

import migrateYdb from './lib/migrate-ydb';

const pkgjson = require('../package.json');

function printMigrated(migrated = []) {
  migrated.forEach((migratedItem) => {
    console.log(`MIGRATED UP: ${migratedItem}`);
  });
}

function handleError(err:any) {
  console.error(`ERROR: ${err.message}`, err.stack);
  process.exit(1);
}

function printStatusTable(statusItems:any) {
  return migrateYdb.config.read().then(() => {
    const table = new Table({ head: ['Filename', 'Hash', 'Applied At'] });
    statusItems.forEach((item:any) => table.push([
      item.fileName,
      item.fileHash,
      item.appliedAt.toString(),
    ]));
    console.log(table.toString());
  });
}

program.version(pkgjson.version);

program
  .command('init')
  .description('initialize a new migration project')
  .action(() => migrateYdb
    .init()
    .then(() => console.log(
      `Initialization successful. Please edit the generated \`${migrateYdb.config.getConfigFilename()}\` file`,
    ))
    .catch((err:any) => handleError(err)));

program
  .command('create [description]')
  .description('create a new database migration with the provided description')
  .option('-f --file <file>', 'use a custom config file')
  .action((description:any, options:any) => {
    (global as any).options = options;
    migrateYdb
      .create(description)
      .then((fileName: string) => migrateYdb.config.read().then((config: any) => {
        console.log(`Created: ${config.migrationsDir}/${fileName}`);
      }))
      .catch((err: any) => handleError(err));
  });

program
  .command('up')
  .description('run all pending database migrations')
  .option('-f --file <file>', 'use a custom config file')
  .action((options: any) => {
    (global as any).options = options;
    migrateYdb.database
      .connect()
      .then((driver:any) => migrateYdb.up(driver))
      .then((migrated: any) => {
        printMigrated(migrated);
        process.exit(0);
      })
      .catch((err: any) => {
        handleError(err);
        printMigrated(err.migrated);
      });
  });

program
  .command('down')
  .description('undo the last applied database migration')
  .option('-f --file <file>', 'use a custom config file')
  .option('-s --step <step>', 'count migration rollback')
  .action((options: any) => {
    (global as any).options = options;
    migrateYdb.database
      .connect()
      .then((driver: any) => migrateYdb.down(driver, options))
      .then((migrated: any) => {
        migrated.forEach((migratedItem: any) => {
          console.log(`MIGRATED DOWN: ${migratedItem}`);
        });
        process.exit(0);
      })
      .catch((err: any) => {
        handleError(err);
      });
  });

program
  .command('status')
  .description('print the changelog of the database')
  .option('-f --file <file>', 'use a custom config file')
  .action((options: any) => {
    (global as any).options = options;
    migrateYdb.database
      .connect()
      .then((driver: any) => migrateYdb.status(driver))
      .then((statusItems: any) => printStatusTable(statusItems))
      .then(() => {
        process.exit(0);
      })
      .catch((err: any) => {
        handleError(err);
      });
  });

program.parse(process.argv);
