"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = __importDefault(require("../logger"));
/**
 * Express middleware to log HTTP requests
 */
const requestLogger = (req, res, next) => {
    // Get the start time
    const start = Date.now();
    // Log the request
    logger_1.default.http(`${req.method} ${req.originalUrl}`);
    // Log request body if it exists and is not empty
    if (req.body && Object.keys(req.body).length > 0) {
        logger_1.default.debug('Request body:', req.body);
    }
    // Override end method to log response
    const originalEnd = res.end;
    // Use type assertion to avoid TypeScript errors with method override
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function (chunk, encoding, callback) {
        // Calculate response time
        const responseTime = Date.now() - start;
        // Log the response
        logger_1.default.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`);
        // Call the original end method
        return originalEnd.call(this, chunk, encoding, callback);
    };
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=logger.js.map