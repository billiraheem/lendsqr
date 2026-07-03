import { Knex } from 'knex';
import { config } from './environment';

function getConnectionConfig(): Knex.MySql2ConnectionConfig | string {
  const jawsdbUrl = process.env.JAWSDB_URL;
  if (jawsdbUrl) {
    return jawsdbUrl;
  }
  return {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password,
  };
}

const knexConfig: Record<string, Knex.Config> = {
  development: {
    client: 'mysql2',
    connection: getConnectionConfig(),
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'mysql2',
    connection: getConnectionConfig(),
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: './dist/database/migrations',
      tableName: 'knex_migrations',
    },
  },

  test: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: `${config.db.name}_test`,
      user: config.db.user,
      password: config.db.password,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './src/database/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
    },
  },
};

export default knexConfig;
