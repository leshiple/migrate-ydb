import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import config from './config';

const DEFAULT_MIGRATIONS_DIR_NAME = 'migrations';
const DEFAULT_MIGRATION_EXT = '.js';

async function resolveMigrationsDirPath() {
  let migrationsDir;
  try {
    const configContent = await config.read();
    migrationsDir = configContent.migrationsDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!migrationsDir) {
      migrationsDir = DEFAULT_MIGRATIONS_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    migrationsDir = DEFAULT_MIGRATIONS_DIR_NAME;
  }

  if (path.isAbsolute(migrationsDir)) {
    return migrationsDir;
  }
  return path.join(process.cwd(), migrationsDir);
}

async function resolveMigrationFileExtension() {
  let migrationFileExtension;
  try {
    const configContent = await config.read();
    migrationFileExtension = configContent.migrationFileExtension || DEFAULT_MIGRATION_EXT;
  } catch (err) {
    // config file could not be read, assume default extension
    migrationFileExtension = DEFAULT_MIGRATION_EXT;
  }

  if (migrationFileExtension && !migrationFileExtension.startsWith('.')) {
    throw new Error('migrationFileExtension must start with dot');
  }

  return migrationFileExtension;
}

async function resolveSampleMigrationFileName() {
  const migrationFileExtention = await resolveMigrationFileExtension();
  return `sample-migration${migrationFileExtention}`;
}

async function resolveSampleMigrationPath() {
  const migrationsDir = await resolveMigrationsDirPath();
  const sampleMigrationSampleFileName = await resolveSampleMigrationFileName();
  return path.join(migrationsDir, sampleMigrationSampleFileName);
}

async function shouldExist() {
  const migrationsDir = await resolveMigrationsDirPath();
  try {
    await fs.stat(migrationsDir);
  } catch (err) {
    throw new Error(`migrations directory does not exist: ${migrationsDir}`);
  }
}

async function shouldNotExist() {
  const migrationsDir = await resolveMigrationsDirPath();
  const error = new Error(
    `migrations directory already exists: ${migrationsDir}`,
  );

  try {
    await fs.stat(migrationsDir);
    throw error;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function getFileNames() {
  const migrationsDir = await resolveMigrationsDirPath();
  const migrationExt = await resolveMigrationFileExtension();
  const files = await fs.readdir(migrationsDir);
  const sampleMigrationFileName = await resolveSampleMigrationFileName();
  return files.filter((file) => (
    path.extname(file) === migrationExt && path.basename(file) !== sampleMigrationFileName
  )).sort();
}

async function loadMigration(fileName: string) {
  const migrationsDir = await resolveMigrationsDirPath();
  return require(path.join(migrationsDir, fileName));// eslint-disable-line
}

async function loadFileHash(fileName: string) {
  const migrationsDir = await resolveMigrationsDirPath();
  const filePath = path.join(migrationsDir, fileName);
  const hash = crypto.createHash('sha256');
  const input = await fs.readFile(filePath);
  hash.update(input);
  return hash.digest('hex');
}

async function doesSampleMigrationExist() {
  const samplePath = await resolveSampleMigrationPath();
  try {
    await fs.stat(samplePath);
    return true;
  } catch (err) {
    return false;
  }
}

export default {
  resolve: resolveMigrationsDirPath,
  resolveSampleMigrationPath,
  resolveMigrationFileExtension,
  shouldExist,
  shouldNotExist,
  getFileNames,
  loadMigration,
  loadFileHash,
  doesSampleMigrationExist,
};
