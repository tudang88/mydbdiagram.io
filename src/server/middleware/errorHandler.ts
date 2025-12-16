import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);
  
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: error.message || 'An unexpected error occurred'
  });
};

