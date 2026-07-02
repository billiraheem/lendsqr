/**
 * Environment Configuration Module
 *
 * WHY THIS EXISTS:
 * ────────────────
 * Instead of using `process.env.DB_HOST` scattered throughout the codebase,
 * we centralize ALL environment variable access here. This gives us:
 *
 * 1. VALIDATION AT STARTUP — If a required env var is missing, the app crashes
 *    immediately with a clear error message. This is "fail fast" — much better
 *    than discovering the missing var hours later when a user hits an endpoint.
 *
 * 2. TYPE SAFETY — We parse strings into the correct types (numbers, booleans).
 *    `process.env.PORT` is always a string; `config.port` is a number.
 *
 * 3. SINGLE SOURCE OF TRUTH — Every part of the app imports from here.
 *    If an env var name changes, we update it in one place.
 *
 * 4. DEFAULTS — We can provide sensible defaults for development while
 *    requiring explicit values in production.
 */

import dotenv from 'dotenv';

// Load .env file into process.env
// This MUST happen before we read any env vars
dotenv.config();

/**
 * Reads an environment variable and throws if it's missing.
 * This is our "fail fast" mechanism.
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
      `   Please check your .env file or environment configuration.\n` +
      `   See .env.example for required variables.`
    );
  }
  return value;
}

/**
 * Reads an environment variable with a default fallback.
 * Used for optional config values.
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Application configuration object.
 * All env vars are validated and typed here.
 */
export const config = {
  // --- Application ---
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: parseInt(getEnv('PORT', '3000'), 10),
  isProduction: getEnv('NODE_ENV', 'development') === 'production',

  // --- Database ---
  db: {
    host: requireEnv('DB_HOST'),
    port: parseInt(getEnv('DB_PORT', '3306'), 10),
    name: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
  },

  // --- JWT Authentication ---
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '1h'),
  },

  // --- Lendsqr Adjutor API ---
  adjutor: {
    baseUrl: requireEnv('ADJUTOR_BASE_URL'),
    apiKey: requireEnv('ADJUTOR_API_KEY'),
  },

  // --- Rate Limiting ---
  rateLimit: {
    windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10), // 15 minutes
    maxRequests: parseInt(getEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
} as const;

// Freeze the config object to prevent accidental mutation
Object.freeze(config);
