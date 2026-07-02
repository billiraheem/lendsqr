import app from './app';
import { config } from './config';
import { logger } from './utils';
import db from './database/connection';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Demo Credit API server running on port ${PORT}`, {
    environment: config.nodeEnv,
    port: PORT,
  });
});

function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close the database connection pool
      await db.destroy();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database connections', { error });
    }

    process.exit(0);
  });

  // Force shutdown after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10000);
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Promise Rejection', { reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default server;
