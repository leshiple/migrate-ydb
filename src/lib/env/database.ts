import _ from 'lodash';
import { Driver, getCredentialsFromEnv, getLogger } from 'ydb-sdk';
import config from './config';

const logger = getLogger({ level: 'debug' });

export default {
  async connect() {
    const configContent = await config.read();
    const entryPoint = _.get(configContent, 'ydb.entryPoint');
    const dbName = _.get(configContent, 'ydb.dbName');
    const timeout = _.get(configContent, 'ydb.options.connectTimeoutMS') || 10000;

    if (!entryPoint) {
      throw new Error('No `entryPoint` defined in config file!');
    }

    if (!dbName) {
      throw new Error('No `dbName` defined in config file!');
    }

    const authService = getCredentialsFromEnv(entryPoint, dbName, logger);
    const driver = new Driver(entryPoint, dbName, authService);

    if (!await driver.ready(timeout)) {
      logger.fatal('Driver has not become ready in 10 seconds!');
      process.exit(1);
    }

    return driver;
  },
};
