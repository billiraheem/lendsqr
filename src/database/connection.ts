import knex, { Knex } from 'knex';
import knexConfig from '../config/database';
import { config } from '../config';

const environment = config.nodeEnv;
const connectionConfig = knexConfig[environment];

if (!connectionConfig) {
  throw new Error(`No Knex configuration found for environment: ${environment}`);
}

const db: Knex = knex(connectionConfig);

export default db;
