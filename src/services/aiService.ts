import Anthropic from '@anthropic-ai/sdk';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { AIRequestQueue, AIRequestService } from './aiRequestQueue';

export interface AIAnalysisResult {
  score: number;
  insights: string[];
  recommendations: string[];
}

export interface PromptParts {
  systemPrompt: string;
  htmlContent: string;
  taskPrompt: string;
}

export abstract class AIService {
  protected abstract makeAIRequest(promptParts: PromptParts | string): Promise<string>;
  
  async analyzeWebsite(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    try {

      const promptParts = this.buildPrompt(websiteData, prompt);

      logger.warn(`[AI_PROMPT] Sending prompt to AI service`, {
        analysisType,
        systemPromptLength: promptParts.systemPrompt.length,
        htmlContentLength: promptParts.htmlContent.length,
        taskPromptLength: promptParts.taskPrompt.length,
        url: websiteData.url
      });

      const response = await this.makeAIRequest(promptParts);
      const result = this.parseAIResponse(response);

      const analysisTime = Date.now() - startTime;
      logger.warn(`[AI_ANALYSIS_COMPLETE] Completed AI analysis successfully`, {
        analysisType,
        url: websiteData.url,
        score: result.score,
        insightsCount: result.insights.length,
        recommendationsCount: result.recommendations.length,
        analysisTimeMs: analysisTime
      });

      return result;
    } catch (error) {
      const analysisTime = Date.now() - startTime;
      logger.error(`[AI_ANALYSIS_ERROR] AI analysis failed`, error as Error, {
        analysisType,
        url: websiteData.url,
        analysisTimeMs: analysisTime
      });
      // Return fallback result instead of throwing
      return this.getFallbackResult(analysisType);
    }
  }

  protected buildPrompt(
    websiteData: WebsiteData,
    specificPrompt: string
  ): { systemPrompt: string; htmlContent: string; taskPrompt: string } {
    const systemPrompt = `You are an expert digital marketing strategist and brand analyst evaluating a website's marketing effectiveness and strategic communication performance.

Your role is to assess how well the site supports the company's marketing, growth, and strategic communication goals — identifying performance gaps and demonstrating clear opportunities for improvement.

You evaluate websites using a qualitative scoring framework focused on 10 dimensions:
1. Clear Value Proposition — does the site immediately communicate what's offered, who it's for, and why it's better than alternatives?
2. Features & Benefits — does the site translate features (what it does) into benefits (how it helps the customer)?
3. CTAs Present — are there clear, compelling calls-to-action including both high-commitment (demo, trial) and low-friction (newsletter, download) options?
4. Navigation & Information Architecture — is the site logically structured and easy to explore?
5. Content-Market Fit — does the content reflect current buyer concerns, market trends, and pain points?
6. Content Strategy — is content used intentionally to drive reach, nurture, and conversion across funnel stages?
7. Brand Tone Consistency — is the voice and tone unified, distinctive, and aligned with the target audience?
8. Trust Signals — are there credible proof elements like logos, testimonials, case studies, awards, and team transparency?
9. Audience Clarity — is it obvious who the product or service is for, and does messaging speak to their specific goals and pain points?
10. Differentiation — does the site clearly communicate what makes this company meaningfully different from competitors or alternatives?

You will be provided with website content (HTML/markdown) and brand data. Evaluate the specific dimension requested in the task prompt.

Score the specific evaluation task on a scale of 0–100 using these bands:
- 0–25: Poor — critical gaps, little to no effectiveness
- 26–50: Below average — significant weaknesses outweigh strengths
- 51–70: Average — meets basic expectations but clear room for improvement
- 71–85: Good — solid execution with minor gaps
- 86–100: Excellent — best-in-class execution

Most websites score between 40–75. Reserve 85+ for genuinely exceptional work and 25 or below for serious failures.

Respond in the following JSON format with detailed, actionable insights:
{
  "score": <integer 0-100 based on your assessment>,
  "insights": [
    "Specific observation grounded in the website content",
    "Second insight with concrete evidence from the site",
    "Third insight identifying a strength or gap",
    "Fourth insight on messaging or audience alignment",
    "Fifth insight on competitive or strategic positioning"
  ],
  "recommendations": [
    "High-priority improvement with specific implementation guidance",
    "Second recommendation addressing a key gap",
    "Third recommendation for strategic enhancement",
    "Fourth recommendation for messaging or content improvement",
    "Fifth recommendation for competitive differentiation"
  ]
}

Ensure all insights and recommendations are:
- Grounded in the specific content and data provided — cite what you actually see
- Specific and actionable with clear implementation steps
- Contextually relevant to the company's industry and audience
- Prioritized by potential marketing and growth impact

Make sure your response is valid JSON and nothing else.`;

    const MAX_CONTENT_LENGTH = 50000;
    const html = websiteData.html.length > MAX_CONTENT_LENGTH
      ? websiteData.html.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for analysis]'
      : websiteData.html;

    const brandingContent = websiteData.branding
      ? `Brand Profile:\n${JSON.stringify(websiteData.branding, null, 2)}\n\nPage Content (Markdown):\n${html}`
      : `Page Content (Markdown):\n${html}`;

    const taskPrompt = `EVALUATION TASK:
${specificPrompt}`;

    return {
      systemPrompt,
      htmlContent: brandingContent,
      taskPrompt
    };
  }

  protected parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      
      // Handle potential markdown formatting or extra text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanedResponse);
      
      // Log the website data that Claude fetched for debugging
      if (parsed.websiteData) {
        logger.warn(`Claude fetched website data:`, {
          title: parsed.websiteData.title,
          industry: parsed.websiteData.industry,
          businessType: parsed.websiteData.businessType,
          hasContent: !!parsed.websiteData.keyContent,
          ctaCount: Array.isArray(parsed.websiteData.ctaButtons) ? parsed.websiteData.ctaButtons.length : 0
        });
      }
      
      return {
        score: Math.max(0, Math.min(100, parsed.score || 0)),
        insights: Array.isArray(parsed.insights) ? parsed.insights : [response.substring(0, 500)],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch (error) {
      logger.warn('Failed to parse AI response, returning raw response as insights');
      // Return the raw response as insights for comprehensive analysis parsing
      return {
        score: 50,
        insights: [response],
        recommendations: ['Please review the website manually'],
      };
    }
  }

  protected getFallbackResult(analysisType: string): AIAnalysisResult {
    return {
      score: 0,
      insights: [`${analysisType} analysis unavailable - manual review recommended`],
      recommendations: [`Please review ${analysisType} manually`],
    };
  }
}

// Circuit breaker states
enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests are blocked
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

// Claude AI Service Implementation
export class ClaudeService extends AIService {
  private anthropic: Anthropic;
  private static consecutiveFailures = 0;
  private static circuitState: CircuitState = CircuitState.CLOSED;
  private static circuitOpenedAt: number | null = null;
  private static readonly FAILURE_THRESHOLD = 5;
  private static readonly CIRCUIT_TIMEOUT = 60000; // 60 seconds

  constructor(apiKey?: string) {
    super();
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Check if circuit breaker allows request
   */
  private checkCircuitBreaker(): void {
    // If circuit is closed, allow request
    if (ClaudeService.circuitState === CircuitState.CLOSED) {
      return;
    }

    // If circuit is open, check if timeout has elapsed
    if (ClaudeService.circuitState === CircuitState.OPEN) {
      const now = Date.now();
      const timeoutElapsed = ClaudeService.circuitOpenedAt && (now - ClaudeService.circuitOpenedAt) >= ClaudeService.CIRCUIT_TIMEOUT;

      if (timeoutElapsed) {
        logger.warn('[CIRCUIT_BREAKER] Entering HALF_OPEN state to test service recovery');
        ClaudeService.circuitState = CircuitState.HALF_OPEN;
        return;
      }

      // Circuit is still open, throw error
      const waitTime = ClaudeService.circuitOpenedAt
        ? Math.ceil((ClaudeService.CIRCUIT_TIMEOUT - (now - ClaudeService.circuitOpenedAt)) / 1000)
        : 0;
      throw new Error(`Circuit breaker OPEN: Claude API is experiencing issues. Please try again in ${waitTime} seconds.`);
    }

    // If circuit is half-open, allow one test request
    // (state will be updated based on the result)
  }

  /**
   * Update circuit breaker state after request
   */
  private updateCircuitBreakerOnSuccess(): void {
    if (ClaudeService.circuitState === CircuitState.HALF_OPEN) {
      logger.warn('[CIRCUIT_BREAKER] Test request succeeded, closing circuit');
      ClaudeService.circuitState = CircuitState.CLOSED;
    }
    ClaudeService.consecutiveFailures = 0;
  }

  /**
   * Update circuit breaker state after failure
   */
  private updateCircuitBreakerOnFailure(): void {
    ClaudeService.consecutiveFailures++;

    if (ClaudeService.circuitState === CircuitState.HALF_OPEN) {
      logger.warn('[CIRCUIT_BREAKER] Test request failed, reopening circuit');
      ClaudeService.circuitState = CircuitState.OPEN;
      ClaudeService.circuitOpenedAt = Date.now();
    } else if (ClaudeService.consecutiveFailures >= ClaudeService.FAILURE_THRESHOLD) {
      logger.error(`[CIRCUIT_BREAKER] Opening circuit after ${ClaudeService.consecutiveFailures} consecutive failures`);
      ClaudeService.circuitState = CircuitState.OPEN;
      ClaudeService.circuitOpenedAt = Date.now();
    }
  }

  protected async makeAIRequest(promptParts: PromptParts | string): Promise<string> {
    // Check circuit breaker before making request
    this.checkCircuitBreaker();
    const maxRetries = 1;
    let attempt = 0;
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();


    while (attempt < maxRetries) {
      const attemptStartTime = Date.now();
      let timeoutId: NodeJS.Timeout | undefined;
      try {

        logger.warn(`[ANTHROPIC_API_CALL] Making API call to Claude with prompt caching`);

        // Build messages array with prompt caching for HTML content
        const messages: any[] = [];

        if (typeof promptParts === 'string') {
          // Legacy string prompt support
          messages.push({
            role: "user",
            content: promptParts
          });
        } else {
          // New structured prompt with caching
          messages.push({
            role: "user",
            content: [
              {
                type: "text",
                text: promptParts.systemPrompt
              },
              {
                type: "text",
                text: `Website Brand Data:\n${promptParts.htmlContent}`,
                cache_control: { type: "ephemeral" }
              },
              {
                type: "text",
                text: promptParts.taskPrompt
              }
            ]
          });
        }

        // Add timeout wrapper
        const apiCallPromise = this.anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 20000,
          temperature: 0.3,
          messages
        });

        // Use standard timeout for all requests
        const timeoutMs = 60000; // 60 seconds timeout

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('API request timeout')), timeoutMs);
        });

        const message = await Promise.race([apiCallPromise, timeoutPromise]);

        // Clear timeout on success to prevent promise leak
        if (timeoutId) clearTimeout(timeoutId);

        // Validate response structure
        if (!message || !message.content || message.content.length === 0) {
          throw new Error('Empty response from Claude API');
        }
        
        const response = message.content[0];
        if (response.type !== 'text') {
          throw new Error(`Unexpected response type: ${response.type}`);
        }
        
        if (!response.text || response.text.trim().length === 0) {
          throw new Error('Empty text response from Claude API');
        }

        const attemptTime = Date.now() - attemptStartTime;
        const totalTime = Date.now() - requestStartTime;

        // Update circuit breaker on success
        this.updateCircuitBreakerOnSuccess();

        // Log cache usage information
        const cacheInfo = {
          cacheCreationTokens: (message.usage as any)?.cache_creation_input_tokens || 0,
          cacheReadTokens: (message.usage as any)?.cache_read_input_tokens || 0,
          regularInputTokens: message.usage?.input_tokens || 0
        };

        logger.warn(`[ANTHROPIC_REQUEST_SUCCESS] Claude API request successful`, {
          requestId,
          attempt: attempt + 1,
          responseLength: response.text.length,
          attemptTimeMs: attemptTime,
          totalTimeMs: totalTime,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
          cacheCreationTokens: cacheInfo.cacheCreationTokens,
          cacheReadTokens: cacheInfo.cacheReadTokens,
          cacheHit: cacheInfo.cacheReadTokens > 0,
          tokensPerSecond: message.usage?.output_tokens ? Math.round(message.usage.output_tokens / (attemptTime / 1000)) : null
        });

        return response.text;
      } catch (error: unknown) {
        // Clear timeout on error to prevent promise leak
        if (timeoutId) clearTimeout(timeoutId);

        attempt++;
        const attemptTime = Date.now() - attemptStartTime;
        const apiError = error as { error?: { type?: string; message?: string }; status?: number };
        const errorMessage = apiError?.error?.message || (error as Error).message;
        const errorType = apiError?.error?.type || 'unknown';
        const statusCode = apiError?.status;

        logger.warn(`[ANTHROPIC_REQUEST_ERROR] Claude API request failed`, {
          requestId,
          attempt,
          maxRetries,
          attemptTimeMs: attemptTime,
          errorType,
          errorMessage,
          statusCode,
          consecutiveFailures: ClaudeService.consecutiveFailures
        });

        // Determine if should retry
        const isRetryableError = this.isRetryableError(error as Error, errorType, statusCode);
        const isLastAttempt = attempt >= maxRetries;

        if (!isRetryableError || isLastAttempt) {
          // Update circuit breaker on failure (only when giving up on retries)
          this.updateCircuitBreakerOnFailure();

          logger.error(`[ANTHROPIC_REQUEST_FAILED] Claude API request failed permanently`, error as Error, {
            requestId,
            finalAttempt: attempt,
            totalTimeMs: Date.now() - requestStartTime,
            isRetryableError,
            isLastAttempt,
            consecutiveFailures: ClaudeService.consecutiveFailures,
            circuitState: ClaudeService.circuitState
          });
          throw new Error(`Claude API request failed: ${errorMessage} (attempt ${attempt}/${maxRetries})`);
        }
        
        // Calculate backoff time
        const baseBackoff = errorType === 'rate_limit_error' ? 10000 : 2000;
        const backoffTime = Math.min(baseBackoff * Math.pow(2, attempt - 1), 30000); // Max 30s
        
        logger.warn(`[ANTHROPIC_RETRY] Retrying Claude API request`, {
          requestId,
          attempt,
          maxRetries,
          backoffTimeMs: backoffTime,
          errorType,
          retryReason: 'retryable_error'
        });
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    const totalTime = Date.now() - requestStartTime;
    logger.error(`[ANTHROPIC_MAX_RETRIES] Max retries exceeded for Claude API request`, undefined, {
      requestId,
      maxRetries,
      totalTimeMs: totalTime,
      consecutiveFailures: ClaudeService.consecutiveFailures
    });
    throw new Error(`Max retries (${maxRetries}) exceeded for Claude API request`);
  }
  
  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: Error, errorType?: string, statusCode?: number): boolean {
    const message = error.message.toLowerCase();
    
    // Always retry these error types
    if (errorType === 'rate_limit_error') return true;
    if (errorType === 'overloaded_error') return true;
    if (errorType === 'internal_server_error') return true;
    
    // Retry specific status codes
    if (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504) return true;
    
    // Retry timeout and network errors
    if (message.includes('timeout') || 
        message.includes('network') || 
        message.includes('connect') ||
        message.includes('econnreset') ||
        message.includes('socket hang up')) return true;
    
    // Don't retry authentication, validation, or client errors
    if (errorType === 'authentication_error' || 
        errorType === 'permission_error' || 
        errorType === 'invalid_request_error' ||
        statusCode === 400 || statusCode === 401 || statusCode === 403) return false;
    
    return false;
  }
}

// Queued Claude AI Service Implementation (for parallel processing)
export class QueuedClaudeService extends AIService implements AIRequestService {
  private anthropic: Anthropic;
  private static globalQueue: AIRequestQueue | null = null;

  constructor(apiKey?: string) {
    super();
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    // Initialize global queue if not exists
    if (!QueuedClaudeService.globalQueue) {
      QueuedClaudeService.globalQueue = new AIRequestQueue(this);
    }
  }

  // This method is called by the AIRequestQueue
  async makeRequest(promptData: string): Promise<string> {
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();

    try {
      // Parse the JSON-encoded prompt data
      const promptParts: PromptParts = JSON.parse(promptData);

      logger.debug(`[QUEUED_CLAUDE] Making direct API call with prompt caching`, {
        requestId,
        systemPromptLength: promptParts.systemPrompt.length,
        htmlContentLength: promptParts.htmlContent.length,
        taskPromptLength: promptParts.taskPrompt.length,
        model: "claude-haiku-4-5-20251001"
      });

      const message = await this.anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20000,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptParts.systemPrompt
              },
              {
                type: "text",
                text: `Website Brand Data:\n${promptParts.htmlContent}`,
                cache_control: { type: "ephemeral" }
              },
              {
                type: "text",
                text: promptParts.taskPrompt
              }
            ]
          }
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const totalTime = Date.now() - requestStartTime;

      // Log cache usage information
      const cacheInfo = {
        cacheCreationTokens: (message.usage as any)?.cache_creation_input_tokens || 0,
        cacheReadTokens: (message.usage as any)?.cache_read_input_tokens || 0,
        regularInputTokens: message.usage?.input_tokens || 0
      };

      logger.info(`[QUEUED_CLAUDE] API request successful`, {
        requestId,
        responseLength: response.text.length,
        totalTimeMs: totalTime,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens,
        cacheCreationTokens: cacheInfo.cacheCreationTokens,
        cacheReadTokens: cacheInfo.cacheReadTokens,
        cacheHit: cacheInfo.cacheReadTokens > 0
      });

      return response.text;
    } catch (error) {
      const totalTime = Date.now() - requestStartTime;
      logger.error(`[QUEUED_CLAUDE] API request failed`, error as Error, {
        requestId,
        totalTimeMs: totalTime
      });
      throw error;
    }
  }

  // Override to use the queue
  protected async makeAIRequest(promptParts: PromptParts | string): Promise<string> {
    if (!QueuedClaudeService.globalQueue) {
      throw new Error('AI request queue not initialized');
    }

    // Convert promptParts to JSON string for queue storage
    const promptData = typeof promptParts === 'string'
      ? promptParts
      : JSON.stringify(promptParts);

    logger.debug(`[QUEUED_CLAUDE] Submitting request to queue`);
    return QueuedClaudeService.globalQueue.enqueueRequest(promptData);
  }

  // Get queue status for monitoring
  static getQueueStatus() {
    return QueuedClaudeService.globalQueue?.getStatus() || null;
  }

  // Clear queue (useful for testing)
  static clearQueue() {
    QueuedClaudeService.globalQueue?.clear();
  }
}
