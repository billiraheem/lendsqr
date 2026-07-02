import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ApiError, logger, sendError } from '../utils';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the full error details server-side
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
  });

  if (err instanceof ApiError) {
    sendError(res, err.statusCode, err.message);
    return;
  }

  if (err.name === 'ValidationError') {
    sendError(res, StatusCodes.BAD_REQUEST, err.message);
    return;
  }

  // For JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired authentication token');
    return;
  }

  sendError(
    res,
    StatusCodes.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred. Please try again later.'
  );
}

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(ApiError.notFound(`Route ${req.method} ${req.path} not found`));
}
