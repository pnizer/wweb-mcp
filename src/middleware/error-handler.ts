import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

/**
 * Express middleware to handle errors
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log the error
  logger.error(`Error processing request: ${req.method} ${req.originalUrl}`, err);

  // Determine status code
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Send error response
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};
