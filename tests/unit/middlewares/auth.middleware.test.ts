import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

jest.mock('../../../src/config/environment', () => ({
  config: {
    nodeEnv: 'test',
    port: 3000,
    isProduction: false,
    db: {
      host: 'localhost',
      port: 3306,
      name: 'test_db',
      user: 'test_user',
      password: 'test_pass',
    },
    jwt: {
      secret: 'test-secret-key-at-least-32-characters-long!',
      expiresIn: '1h',
    },
    adjutor: {
      baseUrl: 'https://adjutor.test.com/v2',
      apiKey: 'test-api-key',
    },
    rateLimit: {
      windowMs: 900000,
      maxRequests: 100,
    },
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { authenticate } from '../../../src/middlewares/auth.middleware';
import { ApiError } from '../../../src/utils/ApiError';

const JWT_SECRET = 'test-secret-key-at-least-32-characters-long!';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });


  it('should call next() with a valid token', () => {
    const token = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: '1h' });
    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.user).toEqual({ userId: 1 });
  });

  it('should attach userId to request', () => {
    const token = jwt.sign({ userId: 42 }, JWT_SECRET, { expiresIn: '1h' });
    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.user?.userId).toBe(42);
  });

  it('should reject requests without Authorization header', () => {
    mockReq.headers = {};

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
    const error = (mockNext as jest.Mock).mock.calls[0][0] as ApiError;
    expect(error.statusCode).toBe(401);
  });

  it('should reject requests with invalid token format', () => {
    mockReq.headers = { authorization: 'InvalidFormat token123' };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('should reject requests with malformed token', () => {
    mockReq.headers = { authorization: 'Bearer not.a.valid.jwt' };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('should reject expired tokens', () => {
    // Create a token that expired 1 hour ago
    const token = jwt.sign(
      { userId: 1 },
      JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    );
    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('should reject tokens signed with wrong secret', () => {
    const token = jwt.sign({ userId: 1 }, 'wrong-secret-key-not-the-real-one!!!', {
      expiresIn: '1h',
    });
    mockReq.headers = { authorization: `Bearer ${token}` };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
  });

  it('should reject requests with empty Bearer token', () => {
    mockReq.headers = { authorization: 'Bearer ' };

    authenticate(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ApiError));
  });
});
