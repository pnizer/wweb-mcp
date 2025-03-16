import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

/**
 * Express middleware to log HTTP requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Get the start time
  const start = Date.now();

  // Log the request
  logger.http(`${req.method} ${req.originalUrl}`);

  // Log request body if it exists and is not empty
  if (req.body && Object.keys(req.body).length > 0) {
    logger.debug('Request body:', req.body);
  }

  // Override end method to log response
  const originalEnd = res.end;

  // Use type assertion to avoid TypeScript errors with method override
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function (chunk: any, encoding?: any, callback?: any): any {
    // Calculate response time
    const responseTime = Date.now() - start;

    // Log the response
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`);

    // Call the original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
};
