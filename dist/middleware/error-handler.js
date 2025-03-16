"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../logger"));
/**
 * Express middleware to handle errors
 */
const errorHandler = (err, req, res, _next) => {
    // Log the error
    logger_1.default.error(`Error processing request: ${req.method} ${req.originalUrl}`, err);
    // Determine status code
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    // Send error response
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error-handler.js.map