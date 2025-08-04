"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimit = exports.auditRateLimit = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.auditRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: {
            message: 'Too many audit requests from this IP, please try again later.',
            statusCode: 429,
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: {
            message: 'Too many requests from this IP, please try again later.',
            statusCode: 429,
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rateLimiter.js.map