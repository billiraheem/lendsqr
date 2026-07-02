import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

interface SuccessResponse<T> {
  status: 'success';
  message: string;
  data: T;
}

interface ErrorResponse {
  status: 'error';
  message: string;
}

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T
): Response<SuccessResponse<T>> {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string
): Response<ErrorResponse> {
  return res.status(statusCode).json({
    status: 'error',
    message,
  });
}

export function sendCreated<T>(
  res: Response,
  message: string,
  data: T
): Response<SuccessResponse<T>> {
  return sendSuccess(res, StatusCodes.CREATED, message, data);
}
