import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(
      `   Missing required environment variable: ${key}\n` +
      `   Please check your .env file or environment configuration.\n` +
      `   See .env.example for required variables.`
    );
  }
  return value;
}

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

const hasDbConnectionString = !!(process.env.DATABASE_URL || process.env.JAWSDB_URL);

export const config = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: parseInt(getEnv('PORT', '3000'), 10),
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  db: {
    host: hasDbConnectionString ? '' : requireEnv('DB_HOST'),
    port: parseInt(getEnv('DB_PORT', '3306'), 10),
    name: hasDbConnectionString ? '' : requireEnv('DB_NAME'),
    user: hasDbConnectionString ? '' : requireEnv('DB_USER'),
    password: hasDbConnectionString ? '' : requireEnv('DB_PASSWORD'),
  },
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '1h'),
  },
  adjutor: {
    baseUrl: requireEnv('ADJUTOR_BASE_URL'),
    apiKey: requireEnv('ADJUTOR_API_KEY'),
  },
  rateLimit: {
    windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxRequests: parseInt(getEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  },
} as const;

Object.freeze(config);
