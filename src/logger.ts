import winston from 'winston';
import path from 'path';
import fs from 'fs';
import util from 'util';

// Check if running in test environment
const isTestEnvironment =
  process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Ensure logs directory exists (skip in test environment)
const logsDir = path.join(process.cwd(), 'logs');
if (!isTestEnvironment) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    // In test environment, fs might be mocked
    console.error('Could not create logs directory:', error);
  }
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log level based on environment
const level = (): string => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
);

// Define the format for file output (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
);

// Create transports based on environment
let transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    stderrLevels: ['error', 'warn'],
  }),
];

// Add file transports only in non-test environments
if (!isTestEnvironment) {
  transports = [
    ...transports,
    // Error log file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),
    // Combined log file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
    }),
  ];
}

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
});

// Define types for the logger methods
type LogMethod = (message: unknown, ...meta: unknown[]) => winston.Logger;
interface LoggerMethods {
  error: LogMethod;
  warn: LogMethod;
  info: LogMethod;
  http: LogMethod;
  debug: LogMethod;
}

// Add a method to log objects with proper formatting
const originalLoggers: LoggerMethods = {
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  info: logger.info.bind(logger),
  http: logger.http.bind(logger),
  debug: logger.debug.bind(logger),
};

// Override the logger methods to handle objects
(Object.keys(originalLoggers) as Array<keyof LoggerMethods>).forEach(level => {
  logger[level] = function (message: unknown, ...meta: unknown[]): winston.Logger {
    // If message is an object, format it
    if (typeof message === 'object' && message !== null) {
      message = util.inspect(message, { depth: 4, colors: false });
    }

    // If there are additional arguments, format them
    if (meta.length > 0) {
      const formattedMeta = meta.map(item => {
        if (typeof item === 'object' && item !== null) {
          return util.inspect(item, { depth: 4, colors: false });
        }
        return item;
      });

      return originalLoggers[level].call(logger, `${message} ${formattedMeta.join(' ')}`);
    }

    return originalLoggers[level].call(logger, message);
  };
});

/**
 * Configure the logger for MCP command mode
 * In command mode, all logs should go to stderr
 */
export function configureForCommandMode(): void {
  // Remove existing console transport
  logger.transports.forEach(transport => {
    if (transport instanceof winston.transports.Console) {
      logger.remove(transport);
    }
  });

  // Add new console transport that sends everything to stderr
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      stderrLevels: Object.keys(levels),
    }),
  );
}

export default logger;
