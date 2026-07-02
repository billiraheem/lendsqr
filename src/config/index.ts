/**
 * Configuration Barrel Export
 *
 * WHY A BARREL FILE?
 * ──────────────────
 * A barrel file re-exports everything from a directory through a single
 * entry point. Instead of:
 *   import { config } from '../config/environment';
 *   import knexConfig from '../config/database';
 *
 * Other modules can do:
 *   import { config, knexConfig } from '../config';
 *
 * This keeps imports clean and provides a single place to manage
 * what's exported from the config module.
 */

export { config } from './environment';
export { default as knexConfig } from './database';
