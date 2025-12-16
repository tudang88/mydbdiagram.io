import { Request, Response, NextFunction } from 'express';

/**
 * Enhanced logging middleware
 * Logs HTTP requests with method, path, status, and response time
 */
export const logger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor =
      res.statusCode >= 500
        ? '\x1b[31m' // Red
        : res.statusCode >= 400
        ? '\x1b[33m' // Yellow
        : res.statusCode >= 300
        ? '\x1b[36m' // Cyan
        : '\x1b[32m'; // Green

    const resetColor = '\x1b[0m';
    console.log(
      `[${timestamp}] ${req.method} ${req.path} ${statusColor}${res.statusCode}${resetColor} ${duration}ms`
    );
  });

  next();
};
