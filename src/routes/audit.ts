import { Router } from 'express';
import { createAudit, getAuditStatus, getAuditResult, getAuditDownload, getAllAudits } from '../controllers/auditController';
import { validateAuditRequest } from '../middleware/validation';
import { auditRateLimit } from '../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/audit:
 *   post:
 *     tags:
 *       - Audit
 *     summary: Submit a new website audit request
 *     description: Submits a website audit request for async processing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuditRequest'
 *     responses:
 *       202:
 *         description: Audit request accepted and queued for processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditSubmissionResponse'
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
 * /api/audit:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get all audit records
 *     description: Retrieves all audit records with pagination support
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: Audit records retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       auditId:
 *                         type: string
 *                       url:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, completed, failed]
 *                       format:
 *                         type: string
 *                       includeScreenshot:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       downloadUrl:
 *                         type: string
 *                         nullable: true
 *                       error:
 *                         type: string
 *                         nullable: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getAllAudits);

/**
 * @swagger
 * /api/audit/{id}/status:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get audit status
 *     description: Retrieves the current status of an audit request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The audit ID
 *     responses:
 *       200:
 *         description: Audit status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditStatusResponse'
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
router.get('/:id/status', getAuditStatus);

/**
 * @swagger
 * /api/audit/{id}/result:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get audit result
 *     description: Retrieves the completed audit result
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The audit ID
 *     responses:
 *       200:
 *         description: Audit result retrieved
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
 *       409:
 *         description: Audit not yet completed
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
router.get('/:id/result', getAuditResult);

/**
 * @swagger
 * /api/audit/{id}/download:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get audit download link
 *     description: Retrieves the Google Drive download link for CSV format
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The audit ID
 *     responses:
 *       200:
 *         description: Download link retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 downloadUrl:
 *                   type: string
 *                   description: Google Drive public download URL
 *                 fileName:
 *                   type: string
 *                   description: Suggested filename for download
 *       404:
 *         description: Audit not found or no download available
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
router.get('/:id/download', getAuditDownload);

export default router;