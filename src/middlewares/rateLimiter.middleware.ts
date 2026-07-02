import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,   // Send rate limit info in `RateLimit-*` headers
  legacyHeaders: false,    // Disable `X-RateLimit-*` headers (deprecated)
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 10 : 100, // Strict in prod, lenient in dev for testing
  message: {
    status: 'error',
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
