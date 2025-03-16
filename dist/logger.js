"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureForCommandMode = configureForCommandMode;
const winston_1 = __importDefault(require("winston"));
const util_1 = __importDefault(require("util"));
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
// Create transports
const transports = [
    // Console transport
    new winston_1.default.transports.Console({
        format: consoleFormat,
        stderrLevels: ['error', 'warn'],
    }),
];
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