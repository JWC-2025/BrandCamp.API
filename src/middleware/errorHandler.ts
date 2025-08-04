import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || false;

  logger.error(`Error ${statusCode}: ${error.message}`, error);

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      error: {
        message: error.message,
        stack: error.stack,
        statusCode,
        isOperational,
      },
    });
  } else {
    res.status(statusCode).json({
      success: false,
      error: {
        message: isOperational ? error.message : 'Internal server error',
        statusCode,
      },
    });
  }
};