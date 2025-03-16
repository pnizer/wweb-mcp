"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureForCommandMode = configureForCommandMode;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
// Check if running in test environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
// Ensure logs directory exists (skip in test environment)
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!isTestEnvironment) {
    try {
        if (!fs_1.default.existsSync(logsDir)) {
            fs_1.default.mkdirSync(logsDir, { recursive: true });
        }
    }
    catch (error) {
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
const level = () => {
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
winston_1.default.addColors(colors);
// Define the format for console output
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`));
// Define the format for file output (without colors)
const fileFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`));
// Create transports based on environment
let transports = [
    // Console transport
    new winston_1.default.transports.Console({
        format: consoleFormat,
        stderrLevels: ['error', 'warn'],
    }),
];
// Add file transports only in non-test environments
if (!isTestEnvironment) {
    transports = [
        ...transports,
        // Error log file transport
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
        }),
        // Combined log file transport
        new winston_1.default.transports.File({
            filename: path_1.default.join(logsDir, 'combined.log'),
            format: fileFormat,
        }),
    ];
}
// Create the logger
const logger = winston_1.default.createLogger({
    level: level(),
    levels,
    transports,
});
// Add a method to log objects with proper formatting
const originalLoggers = {
    error: logger.error.bind(logger),
    warn: logger.warn.bind(logger),
    info: logger.info.bind(logger),
    http: logger.http.bind(logger),
    debug: logger.debug.bind(logger),
};
// Override the logger methods to handle objects
Object.keys(originalLoggers).forEach(level => {
    logger[level] = function (message, ...meta) {
        // If message is an object, format it
        if (typeof message === 'object' && message !== null) {
            message = util_1.default.inspect(message, { depth: 4, colors: false });
        }
        // If there are additional arguments, format them
        if (meta.length > 0) {
            const formattedMeta = meta.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return util_1.default.inspect(item, { depth: 4, colors: false });
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
function configureForCommandMode() {
    // Remove existing console transport
    logger.transports.forEach(transport => {
        if (transport instanceof winston_1.default.transports.Console) {
            logger.remove(transport);
        }
    });
    // Add new console transport that sends everything to stderr
    logger.add(new winston_1.default.transports.Console({
        format: consoleFormat,
        stderrLevels: Object.keys(levels),
    }));
}
exports.default = logger;
//# sourceMappingURL=logger.js.map