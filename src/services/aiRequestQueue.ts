import { logger } from '../utils/logger';

export interface QueuedRequest {
  id: string;
  prompt: string;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
}

export interface AIRequestService {
  makeRequest(prompt: string): Promise<string>;
}

/**
 * Rate-limited queue for AI API requests
 * Enforces Anthropic's 5 requests per minute limit using token bucket algorithm
 */
export class AIRequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private tokens = 5; // Start with full bucket
  private readonly maxTokens = 5;
  private readonly refillRate = 5 / 60; // 5 tokens per 60 seconds
  private lastRefill = Date.now();
  private requestCounter = 0;

  constructor(private aiService: AIRequestService) {
    // Refill tokens every second
    setInterval(() => this.refillTokens(), 1000);
  }

  /**
   * Add request to queue and return promise that resolves when request completes
   */
  async enqueueRequest(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `req_${++this.requestCounter}_${Date.now()}`,
        prompt,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0
      };

      this.queue.push(request);
      logger.debug(`[AI_QUEUE] Request ${request.id} added to queue. Queue length: ${this.queue.length}`);
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests while respecting rate limits
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    logger.debug(`[AI_QUEUE] Starting queue processing. Queue length: ${this.queue.length}`);

    while (this.queue.length > 0) {
      // Check if we have tokens available
      if (this.tokens < 1) {
        const waitTime = Math.ceil((1 - this.tokens) / this.refillRate * 1000);
        logger.warn(`[AI_QUEUE] Rate limit reached. Waiting ${waitTime}ms for token refill`);
        await this.delay(waitTime);
        continue;
      }

      const request = this.queue.shift();
      if (!request) continue;

      try {
        // Consume a token
        this.tokens -= 1;
        
        logger.info(`[AI_QUEUE] Processing request ${request.id}. Tokens remaining: ${this.tokens.toFixed(2)}`);
        
        const startTime = Date.now();
        const result = await this.aiService.makeRequest(request.prompt);
        const duration = Date.now() - startTime;
        
        logger.info(`[AI_QUEUE] Request ${request.id} completed successfully in ${duration}ms`);
        request.resolve(result);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`[AI_QUEUE] Request ${request.id} failed:`, error as Error);
        
        // Retry logic for certain errors
        if (this.shouldRetry(error as Error) && request.retryCount < 2) {
          request.retryCount++;
          logger.warn(`[AI_QUEUE] Retrying request ${request.id} (attempt ${request.retryCount + 1}/3)`);
          
          // Add back to front of queue for immediate retry
          this.queue.unshift(request);
          
          // Wait before retry
          await this.delay(2000 * request.retryCount);
        } else {
          request.reject(new Error(`AI request failed after ${request.retryCount + 1} attempts: ${errorMsg}`));
        }
      }
    }

    this.processing = false;
    logger.debug(`[AI_QUEUE] Queue processing completed`);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('timeout') || 
           message.includes('network') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('504');
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status for monitoring
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      tokensAvailable: this.tokens,
      processing: this.processing,
      requestsProcessed: this.requestCounter
    };
  }

  /**
   * Clear the queue (useful for testing or shutdown)
   */
  clear(): void {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.processing = false;
    logger.info('[AI_QUEUE] Queue cleared');
  }
}