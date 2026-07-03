/**
 * Root Knexfile for Production Deployment
 *
 * Knex CLI expects a knexfile in the root directory.
 * This file redirects to the compiled production database configuration
 * while keeping the working directory at the project root (so .env loads correctly).
 */

require('dotenv').config();
const dbConfig = require('./dist/config/database').default;

module.exports = dbConfig;
