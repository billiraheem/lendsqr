import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import routes from './routes';
import {
  generalLimiter,
  errorHandler,
  notFoundHandler,
} from './middlewares';
import { sendSuccess } from './utils';
import { StatusCodes } from 'http-status-codes';

const app: Application = express();

// Trust the reverse proxy (Render / Heroku) to allow rate limiting to fetch client IPs
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(generalLimiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.get('/api/v1/health', (_req, res) => {
  sendSuccess(res, StatusCodes.OK, 'Demo Credit API is running', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});
app.use('/api/v1', routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
