"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const logger_1 = require("./utils/logger");
const PORT = process.env.PORT || 3000;
const server = app_1.default.listen(PORT, () => {
    logger_1.logger.info(`🚀 Server running on port ${PORT}`);
    logger_1.logger.info(`📊 Agency Audit API is ready to analyze websites!`);
});
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT signal received: closing HTTP server');
    server.close(() => {
        logger_1.logger.info('HTTP server closed');
    });
});
exports.default = server;
//# sourceMappingURL=server.js.map