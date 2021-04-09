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

  // Enable the algorithm to create a checksum of the file contents and use that
  // in the comparison to determin
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,
};

// Return the config as a promise
module.exports = config;
