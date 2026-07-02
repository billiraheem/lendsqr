import winston from 'winston';
import { config } from '../config';

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: config.isProduction ? 'info' : 'debug',
  format: config.isProduction ? productionFormat : developmentFormat,
  defaultMeta: { service: 'demo-credit' },
  transports: [
    // Console output — always enabled
    new winston.transports.Console(),

    // File output — errors go to a separate file for easy monitoring
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB — rotate when file gets too large
      maxFiles: 5,
    }),

    // All logs also go to a combined file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export default logger;
