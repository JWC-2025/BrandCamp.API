import express, { Request, Response } from 'express';
import { Receiver } from '@upstash/qstash';
import { config } from '../config/environment';
import { processAudit } from '../workers/auditWorker';
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware to parse raw body for signature verification
const parseRawBody = (req: Request, _res: Response, next: (error?: any) => void) => {
  if (req.headers['content-type'] === 'application/json') {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        req.body = JSON.parse(data);
        (req as any).rawBody = data;
        next();
      } catch (error) {
        logger.error('Failed to parse JSON body:', error as Error);
        next(error);
      }
    });
  } else {
    next();
  }
};

/**
 * @swagger
 * /api/webhooks/audit:
 *   post:
 *     summary: QStash webhook endpoint for processing audit jobs
 *     description: Receives audit job messages from QStash and processes them
 *     tags: [Webhooks]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobName:
 *                 type: string
 *                 description: Name of the job to process
 *               jobId:
 *                 type: string
 *                 description: Unique identifier for the job
 *               data:
 *                 type: object
 *                 description: Job data containing audit parameters
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Job creation timestamp
 *     responses:
 *       200:
 *         description: Job processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 jobId:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Invalid signature
 *       500:
 *         description: Processing error
 */
router.post('/audit', parseRawBody, async (req: Request, res: Response) => {
  try {
    // Verify QStash signature if signing keys are configured
    if (config.qstash.currentSigningKey && config.qstash.nextSigningKey) {
      const signature = req.headers['upstash-signature'] as string;
      const body = (req as any).rawBody;
      
      if (!signature) {
        logger.warn('Missing Upstash signature header');
        return res.status(401).json({ 
          error: 'Missing signature',
          message: 'Upstash signature header is required' 
        });
      }

      try {
        const receiver = new Receiver({
          currentSigningKey: config.qstash.currentSigningKey,
          nextSigningKey: config.qstash.nextSigningKey
        });

        const isValid = await receiver.verify({
          signature,
          body
        });

        if (!isValid) {
          logger.warn('Invalid QStash signature');
          return res.status(401).json({ 
            error: 'Invalid signature',
            message: 'QStash signature verification failed' 
          });
        }
      } catch (error) {
        logger.error('Signature verification error:', error as Error);
        return res.status(401).json({ 
          error: 'Signature verification failed',
          message: 'Unable to verify QStash signature' 
        });
      }
    } else {
      logger.warn('QStash signing keys not configured, skipping signature verification');
    }

    const { jobName, jobId, data, timestamp } = req.body;

    // Validate request body
    if (!jobName || !jobId || !data) {
      logger.warn('Invalid webhook payload', { jobName, jobId, hasData: !!data });
      return res.status(400).json({
        error: 'Invalid payload',
        message: 'jobName, jobId, and data are required'
      });
    }

    logger.info(`[WEBHOOK] Processing QStash job: ${jobName} (${jobId})`, {
      jobName,
      jobId,
      timestamp,
      url: data.auditRequest?.url
    });

    // Create a job-like object for the processor
    const job = {
      id: jobId,
      data,
      progress: async (progress: number) => {
        logger.debug(`[WEBHOOK] Job ${jobId} progress: ${progress}%`);
      }
    };

    // Process the audit job
    if (jobName === 'process-audit') {
      await processAudit(job);
      
      logger.info(`[WEBHOOK] Successfully processed audit job: ${jobId}`);
      return res.status(200).json({
        success: true,
        jobId,
        message: 'Audit job processed successfully'
      });
    } else {
      logger.warn(`[WEBHOOK] Unknown job type: ${jobName}`);
      return res.status(400).json({
        error: 'Unknown job type',
        message: `Job type "${jobName}" is not supported`
      });
    }

  } catch (error) {
    logger.error('[WEBHOOK] Error processing QStash webhook:', error as Error);
    return res.status(500).json({
      error: 'Processing failed',
      message: 'An error occurred while processing the job'
    });
  }
});

/**
 * @swagger
 * /api/webhooks/health:
 *   get:
 *     summary: Webhook health check
 *     description: Simple health check endpoint for webhook functionality
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Webhook service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;