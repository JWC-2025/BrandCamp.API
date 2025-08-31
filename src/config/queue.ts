import Bull from 'bull';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

// Check if Redis is available
const isRedisAvailable = async (): Promise<boolean> => {
  try {
    const testRedis = new Redis('redis://default:UGbZzuXT8mIDKG8ZI5Dd2svn8h9r56LW@redis-19722.c274.us-east-1-3.ec2.redns.redis-cloud.com:19722');
    
    await testRedis.connect();
    await testRedis.ping();
    testRedis.disconnect();
    return true;
  } catch (error) {
    logger.warn('Redis not available, using in-memory queue for development');
    return false;
  }
};

// Redis connection configuration
// redis://default:UGbZzuXT8mIDKG8ZI5Dd2svn8h9r56LW@redis-19722.c274.us-east-1-3.ec2.redns.redis-cloud.com:19722
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

// Create Redis connection only if available
let redis: Redis | null = null;
let auditQueue: Bull.Queue;

const initializeQueue = async () => {
  const redisAvailable = await isRedisAvailable();
  
  if (redisAvailable) {
    redis = new Redis('redis://default:UGbZzuXT8mIDKG8ZI5Dd2svn8h9r56LW@redis-19722.c274.us-east-1-3.ec2.redns.redis-cloud.com:19722');
    
    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    auditQueue = new Bull('audit processing', {
      redis: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  } else {
    // Fallback: Create a simple in-memory queue
    auditQueue = {
      add: async (name: string, data: any) => {
        logger.info(`Processing job immediately (no Redis): ${name}`);
        // Process immediately since we don't have Redis
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
    } as any;
  }

  auditQueue.on('error', (error) => {
    logger.error('Queue error:', error);
  });

  auditQueue.on('waiting', (jobId) => {
    logger.info(`Job ${jobId} is waiting`);
  });

  auditQueue.on('active', (job) => {
    logger.info(`Job ${job.id} started processing`);
  });

  auditQueue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  auditQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });
};

// Initialize queue
initializeQueue().catch(err => {
  logger.error('Failed to initialize queue:', err);
});

export { redis };
export { auditQueue };

export const closeQueue = async (): Promise<void> => {
  try {
    if (auditQueue && auditQueue.close) {
      auditQueue.close();
    }
    if (redis) {
      redis.disconnect();
    }
    logger.info('Queue and Redis connections closed');
  } catch (error) {
    logger.error('Error closing queue:', error as Error);
  }
};