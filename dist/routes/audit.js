"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditController_1 = require("../controllers/auditController");
const validation_1 = require("../middleware/validation");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
router.post('/', rateLimiter_1.auditRateLimit, validation_1.validateAuditRequest, auditController_1.createAudit);
router.get('/:id', auditController_1.getAuditById);
exports.default = router;
//# sourceMappingURL=audit.js.map