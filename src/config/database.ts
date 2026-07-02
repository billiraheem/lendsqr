/**
 * Knex Database Configuration
 *
 * WHY KNEX?
 * ─────────
 * Knex is a SQL query builder (not a full ORM like Sequelize or TypeORM).
 * The assessment specifically requires KnexJS. Here's why it's a good choice:
 *
 * 1. You write SQL-like queries in JavaScript/TypeScript — easier to understand
 *    what's happening at the database level.
 * 2. Parameterized queries by default — protects against SQL injection.
 * 3. Migration system — version-controlled database schema changes.
 * 4. Works with raw SQL when needed — no "ORM magic" hiding what's happening.
 *
 * KNEX vs. FULL ORM:
 * - Full ORMs (Sequelize, TypeORM) abstract away SQL. This can hide performance
 *   issues and make debugging harder.
 * - Knex gives you SQL-level control with JS ergonomics. Best of both worlds.
 *
 * CONNECTION POOLING:
 * - `pool: { min: 2, max: 10 }` maintains a pool of database connections.
 * - Instead of opening/closing a connection for every query (expensive),
 *   we reuse connections from the pool (cheap).
 * - min: 2 means we always keep 2 connections warm and ready.
 * - max: 10 means we'll never exceed 10 simultaneous connections.
 */

import { Knex } from 'knex';
import { config } from './environment';

/**
 * Knex configuration for different environments.
 * Each environment can have different database settings.
 */
const knexConfig: Record<string, Knex.Config> = {
  development: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
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
    seeds: {
      directory: './src/database/seeds',
      extension: 'ts',
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
    },
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
