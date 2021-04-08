import fs from "fs-extra";
const path = require("path");
const { get } = require("lodash");

const DEFAULT_CONFIG_FILE_NAME = "migrate-ydb-config.js";

let customConfigContent:any = null;

function getConfigPath() {
  const fileOptionValue = get((global as any).options, "file");
  if (!fileOptionValue) {
    return path.join(process.cwd(), DEFAULT_CONFIG_FILE_NAME);
  }

  if (path.isAbsolute(fileOptionValue)) {
    return fileOptionValue;
  }
  return path.join(process.cwd(), fileOptionValue);
}

export default {
  DEFAULT_CONFIG_FILE_NAME,

  set(configContent: any) {
    customConfigContent = configContent
  },

  async shouldExist() {
    if (!customConfigContent) {
      const configPath = getConfigPath();
      try {
        await fs.stat(configPath);
      } catch (err) {
        throw new Error(`config file does not exist: ${configPath}`);
      }
    }
  },

  async shouldNotExist() {
    if (!customConfigContent) {
      const configPath = getConfigPath();
      const error = new Error(`config file already exists: ${configPath}`);
      try {
        await fs.stat(configPath);
        throw error;
      } catch (err) {
        if (err.code !== "ENOENT") {
          throw error;
        }
      }
    }
  },

  getConfigFilename() {
    return path.basename(getConfigPath());
  },

  async read() {
    if (customConfigContent) {
      return customConfigContent;
    }
    const configPath = getConfigPath();
    return Promise.resolve(require(configPath)); // eslint-disable-line
  }
};
