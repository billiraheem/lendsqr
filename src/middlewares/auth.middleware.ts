import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from '../utils';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
      };
    }
  }
}

interface JwtPayload {
  userId: number;
  iat: number;  // Issued at (Unix timestamp)
  exp: number;  // Expiry (Unix timestamp)
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw ApiError.unauthorized('Authentication token is required');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    req.user = { userId: decoded.userId };

    next();
  } catch (error) {
    // SECURITY: Generic error message — don't reveal WHY auth failed
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid or expired authentication token'));
    }
  }
}
