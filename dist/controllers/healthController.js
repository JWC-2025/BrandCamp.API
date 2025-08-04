"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatus = exports.getHealth = void 0;
const constants_1 = require("../utils/constants");
const getHealth = (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: constants_1.API_VERSION,
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
        },
    });
};
exports.getHealth = getHealth;
const getStatus = (_req, res) => {
    res.status(200).json({
        success: true,
        data: {
            service: 'Agency Audit API',
            status: 'operational',
            version: constants_1.API_VERSION,
            endpoints: {
                health: '/api/health',
                audit: '/api/audit',
            },
        },
    });
};
exports.getStatus = getStatus;
//# sourceMappingURL=healthController.js.map