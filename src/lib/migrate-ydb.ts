const init = require("./actions/init");
const create = require("./actions/create");
import up from "./actions/up";
import down from "./actions/down";
import istatus from "./actions/status";
const database = require("./env/database");
import config from "./env/config";

module.exports = {
  init,
  create,
  up,
  down,
  status: istatus,
  database,
  config
};
