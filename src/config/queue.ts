import { Client } from '@upstash/qstash';
import { logger } from '../utils/logger';
import { config } from './environment';

// QStash client configuration
const createQStashClient = (): Client | null => {
  if (!config.qstash.token) {
    logger.warn('QStash token not provided, falling back to in-memory processing');
    return null;
  }
  
  logger.info('Using QStash for queue processing');
  return new Client({
    token: config.qstash.token,
  });
};

// Check if QStash is available
const isQStashAvailable = (): boolean => {
  return !!config.qstash.token;
};

// Queue interface to maintain compatibility with Bull
interface QueueInterface {
  add: (name: string, data: any, options?: any) => Promise<any>;
  process: (name: string, processor?: any) => void;
  close: () => Promise<void>;
  on: (event: string, handler: (...args: any[]) => void) => void;
}

// Create QStash client and queue interface
let qstashClient: Client | null = null;
let auditQueue: QueueInterface;

const initializeQueue = async () => {
  const qstashAvailable = isQStashAvailable();
  
  if (qstashAvailable) {
    qstashClient = createQStashClient();
    
    if (!qstashClient) {
      throw new Error('Failed to create QStash client');
    }

    logger.info('Connected to QStash', {
      hasToken: !!config.qstash.token,
    });

    // Create QStash-based queue interface
    auditQueue = {
      add: async (name: string, data: any, options?: any) => {
        try {
          const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          logger.info(`Adding job to QStash: ${name} (${jobId})`);
          
          // Use QStash to publish a message to a webhook endpoint
          // You'll need to configure a webhook endpoint to receive these messages
          const webhookUrl = config.qstash.url || `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/api/webhooks/audit`;
          
          const result = await qstashClient!.publishJSON({
            url: webhookUrl,
            body: {
              jobName: name,
              jobId,
              data,
              timestamp: new Date().toISOString(),
            },
            delay: options?.delay || 0,
            retries: options?.attempts || 3,
          });
          
          logger.info(`Job ${jobId} queued successfully`, { messageId: result.messageId });
          return { id: jobId, messageId: result.messageId };
        } catch (error) {
          logger.error(`Failed to queue job ${name}:`, error as Error);
          throw error;
        }
      },
      
      process: (name: string, _processor?: any) => {
        logger.info(`Registered processor for ${name} (QStash mode)`);
        // In QStash mode, processing happens via webhook endpoints
        // The processor registration is for compatibility but actual processing
        // happens when the webhook receives the message
      },
      
      close: async () => {
        logger.info('QStash queue closed');
        // QStash client doesn't need explicit closing
      },
      
      on: (event: string, _handler: (...args: any[]) => void) => {
        // Event handling for compatibility - logging events
        logger.debug(`Event listener registered for ${event} (QStash mode)`);
      },
    };
  } else {
    // Fallback: Create a simple in-memory queue
    logger.warn('QStash not available, using in-memory processing');
    auditQueue = {
      add: async (name: string, data: any) => {
        logger.info(`Processing job immediately (no QStash): ${name}`);
        // Process immediately since we don't have QStash
        const { processAudit } = await import('../workers/auditWorker');
        const mockJob = {
          id: Date.now().toString(),
          data,
          opts: {},
          attemptsMade: 0,
          queue: null,
          progress: async () => {},
        } as any;
        setTimeout(() => processAudit(mockJob), 0);
        return { id: Date.now().toString() };
      },
      process: (name: string) => {
        logger.info(`Registered processor for ${name} (in-memory mode)`);
        // Store processor for later use if needed
      },
      close: () => Promise.resolve(),
      on: () => {},
    };
  }

  // Log queue events for monitoring
  auditQueue.on('error', (error) => {
    logger.error('Queue error:', error);
  });
};

// Initialize queue
initializeQueue().catch(err => {
  logger.error('Failed to initialize queue:', err);
});

export { qstashClient };
export { auditQueue };

export const closeQueue = async (): Promise<void> => {
  try {
    if (auditQueue && auditQueue.close) {
      await auditQueue.close();
    }
    logger.info('Queue connections closed');
  } catch (error) {
    logger.error('Error closing queue:', error as Error);
  }
};