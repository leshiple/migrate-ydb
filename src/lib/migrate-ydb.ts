import up from './actions/up';
import down from './actions/down';
import istatus from './actions/status';
import config from './env/config';
import init from './actions/init';
import create from './actions/create';
import database from './env/database';

export default {
  init,
  create,
  up,
  down,
  status: istatus,
  database,
  config,
};
