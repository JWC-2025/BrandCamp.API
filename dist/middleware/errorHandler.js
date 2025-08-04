"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    const isOperational = error.isOperational || false;
    logger_1.logger.error(`Error ${statusCode}: ${error.message}`, error);
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
    }
    else {
        res.status(statusCode).json({
            success: false,
            error: {
                message: isOperational ? error.message : 'Internal server error',
                statusCode,
            },
        });
    }
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map