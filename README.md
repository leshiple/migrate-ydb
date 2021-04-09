migrate-ydb is a database migration tool for [Yandex Database](https://cloud.yandex.ru/services/ydb) running in Node.js
    
## Installation
````bash
$ npm install -g migrate-ydb
````

## CLI Usage
````
$ migrate-ydb
Usage: migrate-ydb [options] [command]


  Commands:

    init                  initialize a new migration project
    create [description]  create a new database migration with the provided description
    up [options]          run all unapplied database migrations
    down [options]        undo the last applied database migration
    status [options]      print the changelog of the database

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
````

## Basic Usage
### Initialize a new project
Make sure you have [Node.js](https://nodejs.org/en/) 10 (or higher) installed.  

Create a directory where you want to store your migrations for your ydb database (eg. 'albums' here) and cd into it
````bash
$ mkdir albums-migrations
$ cd albums-migrations
````

Initialize a new migrate-ydb project
````bash
$ migrate-ydb init
Initialization successful. Please edit the generated migrate-ydb-config.js file
````

The above command did two things: 
1. create a sample 'migrate-ydb-config.js' file and 
2. create a 'migrations' directory

Edit the migrate-ydb-config.js file. An object or promise can be returned. 
````javascript
// In this file you can configure migrate-ydb

// Choose one
// process.env.YDB_TOKEN = "xxxxxxxxxxxxxx";
// yc iam create-token
//
// process.env.SA_JSON_FILE = 'key.json';
// yc iam key create --service-account-name $sa_name --output ./key.json

const config = {
  ydb: {
    entryPoint: 'grpcs://ydb.serverless.yandexcloud.net:2135',
    dbName: '/ru-central1/xxxxxxxxxxxxxxxxxxxxxxx',

    options: {
      connectTimeoutMS: 10000, // connection timeout
    },
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: 'migrations',

  // The ydb table where the applied changes are stored. Only edit this when really necessary.
  migrationsTable: 'migrations',

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: '.js',
};

// Return the config as a promise
module.exports = config;

````

### Creating a new migration script
To create a new database migration script, just run the ````migrate-ydb create [description]```` command.

For example:
````bash
$ migrate-ydb create cats
Created: migrations/2016_06_08_15-59-48-cats.js
````

A new migration file is created in the 'migrations' directory:
````javascript
module.exports = {
  up(driver) {
    // TODO write your migration here. Return a Promise (and/or use async & await).
  },

  down(driver) {
    // TODO write the statements to rollback your migration (if possible)
  }
};
````

Edit this content so it actually performs changes to your database. Don't forget to write the down part as well.

#### Example:

````javascript
module.exports = {
  async up(driver) {
    await driver.tableClient.withSession(async (session) => {
      await session.createTable(
        'cats',
        new TableDescription()
          .withColumn(new Column(
              'id',
              Ydb.Type.create({optionalType: {item: {typeId: Ydb.Type.PrimitiveTypeId.UINT64}}})
          ))
          .withColumn(new Column(
              'name',
              Ydb.Type.create({optionalType: {item: {typeId: Ydb.Type.PrimitiveTypeId.UTF8}}})
          ))
      );
    });
  },

  async down(driver) {
    await driver.tableClient.withSession(async (session) => {
      await session.dropTable('cats');
    });
  },
};
````
More examples [here](https://github.com/yandex-cloud/ydb-nodejs-sdk/tree/master/examples).

#### Overriding the sample migration
To override the content of the sample migration that will be created by the `create` command, 
create a file **`sample-migration.js`** in the migrations directory.

### Checking the status of the migrations
At any time, you can check which migrations are applied (or not)

````bash
$ migrate-ydb status
┌────────────────────────────┬────────────────────────────────┬──────────────────────────┐
│ Filename                   │ Hash                           │ Applied At               │
├────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_15-59-48-cats.js│ 7625a0220d552dbeb42e26fdab61d8 │ PENDING                  │
└────────────────────────────┴────────────────────────────────┴──────────────────────────┘

````
`Hash` - sha256 file hash

Enabled tracking a hash of the file contents and will run a file with the same name again as long as the file contents have changes. Each script needs to be written in a manner where it can be re-run safefly.  A script of the same name and hash will not be executed again, only if the hash changes.


### Migrate up
This command will apply all pending migrations
````bash
$ migrate-ydb up
MIGRATED UP: 2016_06_08_15-59-48-cats.js
````

If an an error occurred, it will stop and won't continue with the rest of the pending migrations

If we check the status again, we can see the last migration was successfully applied:
````bash
$ migrate-ydb status
┌────────────────────────────┬────────────────────────────────┬──────────────────────────┐
│ Filename                   │ Hash                           │ Applied At               │
├────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_15-59-48-cats.js│ 7625a0220d552dbeb42e26fdab61d8 │ 2016_06_08_18-19-18      │
└────────────────────────────┴────────────────────────────────┴──────────────────────────┘

````

### Migrate down
With this command, migrate-ydb will revert the applied migration

#### Rollback the last applied migration
````bash
$ migrate-ydb down
MIGRATED DOWN: 2016_06_08_15-59-48-cats.js
````

If we check the status again, we see that the reverted migration is pending again:
````bash
$ migrate-ydb status
┌────────────────────────────┬────────────────────────────────┬──────────────────────────┐
│ Filename                   │ Hash                           │ Applied At               │
├────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_15-59-48-cats.js│ 7625a0220d552dbeb42e26fdab61d8 │ PENDING                  │
└────────────────────────────┴────────────────────────────────┴──────────────────────────┘
````

#### Rollback the all applied migration
````bash
$ migrate-ydb down --step=all
MIGRATED DOWN: 2016_06_08_15-59-48-cats.js
MIGRATED DOWN: 2016_06_08_16-59-48-dogs.js
MIGRATED DOWN: 2016_06_08_17-59-48-mouses.js
````

If we check the status again, we see that the reverted migration is pending again:
````bash
$ migrate-ydb status
┌──────────────────────────────┬────────────────────────────────┬─────────────────────┐
│ Filename                     │ Hash                           │ Applied At          │
├──────────────────────────────┼────────────────────────────────┼─────────────────────┤
│ 2016_06_08_15-59-48-cats.js  │ 7625a0220d552dbeb42e26fdab61d8 │ 2016_06_08_20-13-30 │
├──────────────────────────────┼────────────────────────────────┼─────────────────────┤
│ 2016_06_08_16-59-48-dogs.js  │ 2625bfn506hjxb2kjhk345zxfg8973 │ PENDING             │
├──────────────────────────────┼────────────────────────────────┼─────────────────────┤
│ 2016_06_08_17-59-48-mouses.js│ 681jhx87zvl57bskjhyksdf7cbkjrg │ PENDING             │
└──────────────────────────────┴────────────────────────────────┴─────────────────────┘

````

#### Rollback the last two applied migration
````bash
$ migrate-ydb down --step=a2
MIGRATED DOWN: 2016_06_08_16-59-48-dogs.js
MIGRATED DOWN: 2016_06_08_17-59-48-mouses.js
````

If we check the status again, we see that the reverted migration is pending again:
````bash
$ migrate-ydb status
┌──────────────────────────────┬────────────────────────────────┬──────────────────────────┐
│ Filename                     │ Hash                           │ Applied At               │
├──────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_15-59-48-cats.js  │ 7625a0220d552dbeb42e26fdab61d8 │ PENDING                  │
├──────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_16-59-48-dogs.js  │ 2625bfn506hjxb2kjhk345zxfg8973 │ PENDING                  │
├──────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_17-59-48-mouses.js│ 681jhx87zvl57bskjhyksdf7cbkjrg │ PENDING                  │
└──────────────────────────────┴────────────────────────────────┴──────────────────────────┘

````

````
$ migrate-ydb down --help
Usage: migrate-ydb down [options]

undo the applied database migration

Options:
  -f --file <file>  use a custom config file
  -s --step <step>  count migration rollback
  -h, --help        display help for command
````

## Advanced Features

### Using a custom config file
All actions (except ```init```) accept an optional ````-f```` or ````--file```` option to specify a path to a custom config file.
By default, migrate-ydb will look for a ````migrate-ydb-config.js```` config file in of the current directory.

#### Example:

````bash
$ migrate-ydb status -f '~/configs/albums-migrations.js'
┌────────────────────────────┬────────────────────────────────┬──────────────────────────┐
│ Filename                   │ Hash                           │ Applied At               │
├────────────────────────────┼────────────────────────────────┼──────────────────────────┤
│ 2016_06_08_15-59-48-cats.js│ 7625a0220d552dbeb42e26fdab61d8 │ PENDING                  │
└────────────────────────────┴────────────────────────────────┴──────────────────────────┘

````

### Using npm packages in your migration scripts
You can use use Node.js modules (or require other modules) in your migration scripts.
It's even possible to use npm modules, just provide a `package.json` file in the root of your migration project:

````bash
$ cd albums-migrations
$ npm init --yes
````

Now you have a package.json file, and you can install your favorite npm modules that might help you in your migration scripts.


### Version
To know which version of migrate-ydb you're running, just pass the `version` option:

````bash
$ migrate-ydb version
````

## API Usage

```javascript
const {
  init,
  create,
  database,
  config,
  up,
  down,
  status
} = require('migrate-ydb');
```

### `init() → Promise`

Initialize a new migrate-ydb project
```javascript
await init();
```

The above command did two things: 
1. create a sample `migrate-ydb-config.js` file and 
2. create a `migrations` directory

Edit the `migrate-ydb-config.js` file.

### `create(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create('cats');
console.log('Created:', fileName);
```

A new migration file is created in the `migrations` directory.

### `database.connect() → Promise<{driver}>`

Connect to an ydb using the connection settings from the `migrate-ydb-config.js` file.

```javascript
const { driver } = await database.connect();
```

### `config.read() → Promise<JSON>`

Read connection settings from the `migrate-ydb-config.js` file.

```javascript
const ydbConnectionSettings = await config.read();
```

### `config.set(yourConfigObject)`

Tell migrate-ydb NOT to use the `migrate-ydb-config.js` file, but instead use the config object passed as the first argument of this function.
When using this feature, please do this at the very beginning of your program.

Example:
```javascript
const { config, up } = require('../lib/migrate-ydb');

const myConfig = {
    ydb: {
      entryPoint: 'grpcs://ydb.serverless.yandexcloud.net:2135',
      dbName: '/ru-central1/xxxxxxxxxxxxxxxxxxxxxxx',

      options: {
        connectTimeoutMS: 10000, // connection timeout
      },
    },
    migrationsDir: "migrations",
    migrationsTable: "migrations",
    migrationFileExtension: ".js"
};

config.set(myConfig);

// then, use the API as you normally would, eg:
await up();
```

### `up(driver) → Promise<Array<fileName>>`

Apply all pending migrations

```javascript
const { driver } = await database.connect();
const migrated = await up(driver);
migrated.forEach(fileName => console.log('Migrated:', fileName));
```

If an an error occurred, the promise will reject and won't continue with the rest of the pending migrations.

### `down(driver) → Promise<Array<fileName>>`

Revert (only) the last applied migration

```javascript
const { db, client } = await database.connect();
const migratedDown = await down(db, client);
migratedDown.forEach(fileName => console.log('Migrated Down:', fileName));
```

### `status(driver) → Promise<Array<{ fileName, fileHash, appliedAt }>>`

Check which migrations are applied (or not.

```javascript
const { driver } = await database.connect();
const migrationStatus = await status(driver);
migrationStatus.forEach(({ fileName, fileHash, appliedAt }) => console.log(fileName, ':', fileHash, ':', appliedAt));
```

### `client.close() → Promise`
Close the database connection

```javascript
const { driver } = await database.connect();
await driver.destroy();
```
