/**
 * Custom API Error Class
 *
 * WHY CUSTOM ERRORS?
 * ──────────────────
 * JavaScript's built-in `Error` class doesn't have an HTTP status code.
 * When an error occurs in our service layer (e.g., "user not found"), we need
 * to communicate BOTH:
 *   1. What went wrong (message)
 *   2. What HTTP status to return (statusCode)
 *
 * By creating a custom error class, we can throw errors anywhere in our code
 * and the global error handler will know exactly how to respond:
 *
 *   throw new ApiError(404, 'User not found');
 *   // → The error handler returns: { status: "error", message: "User not found" }
 *   // → With HTTP status 404
 *
 * This is the STRATEGY PATTERN in action — different error types are handled
 * uniformly by a single error handler.
 *
 * SECURITY NOTE:
 * We separate `message` (user-facing) from the actual error details.
 * The user NEVER sees stack traces or internal error information.
 */

import { StatusCodes } from 'http-status-codes';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  /**
   * Creates a new API error.
   *
   * @param statusCode - HTTP status code (e.g., 400, 404, 500)
   * @param message - User-facing error message (keep it generic for security)
   * @param isOperational - Whether this is an expected error (true) or a bug (false)
   *
   * WHY `isOperational`?
   * - Operational errors are expected: "user not found", "insufficient balance"
   * - Non-operational errors are bugs: null pointer, type errors
   * - In production, you might want to restart the process for non-operational errors
   *   but continue running for operational ones.
   */
  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly (TypeScript quirk with extending built-in classes)
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Factory methods for common error types.
   * These make the code more readable and consistent.
   *
   * Instead of: throw new ApiError(400, 'Invalid input')
   * We write:   throw ApiError.badRequest('Invalid input')
   */
  static badRequest(message: string): ApiError {
    return new ApiError(StatusCodes.BAD_REQUEST, message);
  }

  static unauthorized(message: string = 'Authentication required'): ApiError {
    return new ApiError(StatusCodes.UNAUTHORIZED, message);
  }

  static forbidden(message: string = 'Access denied'): ApiError {
    return new ApiError(StatusCodes.FORBIDDEN, message);
  }

  static notFound(message: string = 'Resource not found'): ApiError {
    return new ApiError(StatusCodes.NOT_FOUND, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(StatusCodes.CONFLICT, message);
  }

  static internal(message: string = 'An unexpected error occurred'): ApiError {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, false);
  }
}
