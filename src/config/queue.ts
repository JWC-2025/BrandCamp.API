import Bull from 'bull';
import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';
import { config } from './environment';

// Redis connection configuration
// Supports both individual config options and complete Redis URL
const createRedisConnection = (): Redis => {
  // If REDIS_URL is provided, use it directly (common in production environments like Vercel, Heroku, etc.)
  if (config.redis.url) {
    logger.warn('Using Redis URL from environment variable');
    return new Redis(config.redis.url);
  }
  
  // Otherwise use individual environment variables
  logger.warn('Using individual Redis configuration from environment variables');
  const redisOptions: RedisOptions = {
    host: config.redis.host,
    port: config.redis.port,
    ...(config.redis.password && { password: config.redis.password }),
    ...(config.redis.username && { username: config.redis.username }),
    connectionName: 'audit-api',
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };
  
  return new Redis(redisOptions);
};

// Check if Redis is available
const isRedisAvailable = async (): Promise<boolean> => {
  try {
    const testRedis = createRedisConnection();
    
    await testRedis.connect();
    await testRedis.ping();
    testRedis.disconnect();
    return true;
  } catch (error) {
    logger.warn('Redis not available: ' + error);
    return false;
  }
};

// Create Redis connection only if available
let redis: Redis | null = null;
let auditQueue: Bull.Queue;

const initializeQueue = async () => {
  const redisAvailable = await isRedisAvailable();
  
  if (redisAvailable) {
    redis = createRedisConnection();
    
    redis.on('connect', () => {
      if (config.redis.url) {
        // Redis URL format - mask the password for security
        const maskedUrl = config.redis.url.replace(/:([^:@]+)@/, ':***@');
        logger.warn('Connected to Redis via URL', { url: maskedUrl });
      } else {
        // Object format
        logger.warn('Connected to Redis', {
          host: config.redis.host,
          port: config.redis.port,
          hasPassword: !!config.redis.password,
          hasUsername: !!config.redis.username
        });
      }
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    // Create the Redis configuration for Bull queue
    const bullRedisConfig = config.redis.url 
      ? config.redis.url 
      : {
          host: config.redis.host,
          port: config.redis.port,
          ...(config.redis.password && { password: config.redis.password }),
          ...(config.redis.username && { username: config.redis.username }),
        };

    auditQueue = new Bull('audit processing', {
      redis: bullRedisConfig,
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
    // Fallback: Create a simple in-memory queue with sequential processing
    const jobQueue: any[] = [];
    let isProcessing = false;

    const processNextJob = async () => {
      if (isProcessing || jobQueue.length === 0) return;
      
      isProcessing = true;
      const job = jobQueue.shift();
      
      try {
        logger.warn(`Processing job sequentially (no Redis): ${job.name}`);
        const { processAudit } = await import('../workers/auditWorker');
        await processAudit(job);
      } catch (error) {
        logger.error(`In-memory job failed:`, error);
      } finally {
        isProcessing = false;
        // Process next job if available
        setTimeout(processNextJob, 0);
      }
    };

    auditQueue = {
      add: async (name: string, data: any) => {
        const mockJob = {
          id: Date.now().toString(),
          name,
          data,
          opts: {},
          attemptsMade: 0,
          queue: null,
          progress: async () => {},
        } as any;
        
        jobQueue.push(mockJob);
        logger.warn(`Job queued (in-memory): ${name}, queue length: ${jobQueue.length}`);
        
        // Start processing if not already running
        setTimeout(processNextJob, 0);
        return { id: mockJob.id };
      },
      process: (name: string) => {
        logger.info(`Registered processor for ${name} (in-memory mode)`);
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