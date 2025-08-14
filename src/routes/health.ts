import { Router } from 'express';
import { getHealth, getStatus } from '../controllers/healthController';

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Get API health status
 *     description: Returns the current health status of the API
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', getHealth);

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     tags:
 *       - Health
 *     summary: Get detailed API status
 *     description: Returns detailed status information about the API
 *     responses:
 *       200:
 *         description: Detailed API status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/status', getStatus);

export default router;