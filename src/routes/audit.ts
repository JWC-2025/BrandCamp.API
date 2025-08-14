import { Router } from 'express';
import { createAudit, getAuditById } from '../controllers/auditController';
import { validateAuditRequest } from '../middleware/validation';
import { auditRateLimit } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/audit:
 *   post:
 *     tags:
 *       - Audit
 *     summary: Create a new website audit
 *     description: Analyzes a website and generates a comprehensive audit report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditRequest'
 *     responses:
 *       201:
 *         description: Audit created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditResult'
 *       400:
 *         description: Bad request - invalid URL or parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', auditRateLimit, validateAuditRequest, createAudit);

/**
 * @swagger
 * /api/audit/{id}:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get audit by ID
 *     description: Retrieves a specific audit report by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The audit ID
 *     responses:
 *       200:
 *         description: Audit found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditResult'
 *       404:
 *         description: Audit not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', getAuditById);

export default router;