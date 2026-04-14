import { logger } from '../utils/logger';

// In-memory job queue (no Redis/Bull dependency)
const jobQueue: any[] = [];
let isProcessing = false;

const processNextJob = async () => {
  if (isProcessing || jobQueue.length === 0) return;

  isProcessing = true;
  const job = jobQueue.shift();

  try {
    logger.warn(`Processing job sequentially (in-memory): ${job.name}`);
    const { processAudit } = await import('../workers/auditWorker');
    await processAudit(job);
  } catch (error) {
    logger.error(`In-memory job failed:`, error as Error);
  } finally {
    isProcessing = false;
    setTimeout(processNextJob, 0);
  }
};

const auditQueue = {
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

    setTimeout(processNextJob, 0);
    return { id: mockJob.id };
  },
  process: (name: string) => {
    logger.info(`Registered processor for ${name} (in-memory mode)`);
  },
  close: () => Promise.resolve(),
  on: (event: string, _handler: any) => {
    logger.info(`Queue event listener registered: ${event} (in-memory mode)`);
  },
} as any;

export const getAuditQueue = async (): Promise<any> => {
  return auditQueue;
};

export const closeQueue = async (): Promise<void> => {
  logger.info('In-memory queue closed');
};
