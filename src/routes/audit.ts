import { Router } from 'express';
import { createAudit, getAuditById } from '../controllers/auditController';
import { validateAuditRequest } from '../middleware/validation';
import { auditRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/', auditRateLimit, validateAuditRequest, createAudit);
router.get('/:id', getAuditById);

export default router;