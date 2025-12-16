import { Request, Response, NextFunction } from 'express';

/**
 * Enhanced error handler middleware
 * Provides detailed error logging and user-friendly error messages
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log error with context
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const errorDetails = {
    timestamp,
    method,
    path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  console.error('Error occurred:', JSON.stringify(errorDetails, null, 2));

  // Determine error type and status code
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
  }

  // Send user-friendly error response
  res.status(statusCode).json({
    error: errorCode,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { details: errorDetails }),
  });
};
