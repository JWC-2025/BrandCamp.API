import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { AIRequestQueue, AIRequestService } from './aiRequestQueue';

export interface AIAnalysisResult {
  score: number;
  insights: string[];
  recommendations: string[];
}

export abstract class AIService {
  protected abstract makeAIRequest(prompt: string): Promise<string>;
  
  private validatePromptSize(prompt: string): string {
    const maxSize = 10000; // Reasonable limit to avoid token issues
    if (prompt.length <= maxSize) return prompt;
    
    // Truncate while preserving the task section
    const taskSection = prompt.split('EVALUATION TASK:');
    if (taskSection.length === 2) {
      const prefix = taskSection[0].substring(0, maxSize * 0.7);
      return prefix + '\n\nEVALUATION TASK:\n' + taskSection[1];
    }
    
    return prompt.substring(0, maxSize) + '\n\n[Content truncated for size limits]';
  }

  async analyzeWebsite(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    try {
      logger.warn(`[AI_ANALYSIS_START] Starting AI analysis`, {
        analysisType,
        url: websiteData.url,
        hasScreenshot: !!websiteData.screenshot,
        timestamp: new Date().toISOString()
      });
      
      const fullPrompt = this.buildPrompt(websiteData, prompt);
      const validatedPrompt = this.validatePromptSize(fullPrompt);
      
      logger.warn(`[AI_PROMPT] Sending prompt to AI service`, {
        analysisType,
        promptLength: validatedPrompt.length,
        url: websiteData.url
      });
      
      const response = await this.makeAIRequest(validatedPrompt);
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
  ): string {
    return `
You are an expert marketing analyst and web performance specialist evaluating a website.

STEP 1: WEBSITE DATA COLLECTION
First, use your web fetch tool to retrieve and analyze the website at: ${websiteData.url}

IMPORTANT WEBSITE FETCH INSTRUCTIONS:
- Use your built-in web fetch capability to retrieve the complete website content
- Extract all relevant HTML, meta tags, content, and structure information
- Limit content size to 5MB to avoid large files
- Skip video content if encountered
- If the website is too large or unavailable, provide a clear error message

STEP 2: BUSINESS CONTEXT ANALYSIS
After fetching the website, analyze the content to determine:
- Industry type and business model
- Target audience and customer segments  
- Primary business goals and objectives
- Appropriate industry standards and best practices

STEP 3: DETAILED EVALUATION
Then use this context to evaluate the specific area requested.

EVALUATION TASK:
${specificPrompt}

Please provide a comprehensive analysis considering:
1. The business context and industry standards you identified from the fetched website
2. Target audience expectations and needs based on the actual content
3. Industry-specific best practices
4. Content quality and messaging effectiveness from the live website
5. Visual design and user experience elements visible in the website

Respond in the following JSON format with detailed, actionable insights:
{
  "websiteData": {
    "title": "<extracted page title>",
    "description": "<extracted meta description>",
    "mainHeadings": ["<h1 tags found>"],
    "keyContent": "<summary of main content>",
    "ctaButtons": ["<call-to-action buttons found>"],
    "industry": "<detected industry>",
    "businessType": "<business model type>"
  },
  "context": {
    "industry": "<detected industry>",
    "businessType": "<business model type>",
    "targetAudience": "<primary target audience>",
    "primaryGoal": "<main business objective>"
  },
  "score": <number between 0-100>,
  "insights": [
    "Primary insight with specific details from the live website",
    "Secondary insight with contextual analysis", 
    "Content insight with messaging evaluation based on actual content",
    "Design insight with user experience observations",
    "Industry-specific insight with competitive context"
  ],
  "recommendations": [
    "High-priority recommendation with implementation approach",
    "Medium-priority recommendation with expected impact",
    "Content recommendation with specific messaging improvements", 
    "Design recommendation for better user experience",
    "Strategic recommendation for long-term optimization"
  ]
}

Ensure all insights and recommendations are:
- Based on the actual content you fetched from the live website
- Specific and actionable with clear implementation steps
- Contextually relevant to the industry and business type you identified
- Backed by observable data from the website analysis
- Prioritized by potential impact and implementation difficulty

Make sure your response is valid JSON and nothing else.
`;
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
      score: 50,
      insights: [`${analysisType} analysis unavailable - manual review recommended`],
      recommendations: [`Please review ${analysisType} manually`],
    };
  }
}

// Claude AI Service Implementation
export class ClaudeService extends AIService {
  private anthropic: Anthropic;
  private readonly minRequestInterval = 12000; // 12 seconds for 5 req/min limit
  private static lastRequestTime = 0;
  private static healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  private static lastHealthCheck = 0;
  private static consecutiveFailures = 0;

  constructor(apiKey?: string) {
    super();
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Perform health check on Anthropic API
   */
  private async performHealthCheck(): Promise<boolean> {
    const now = Date.now();
    const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
    
    // Skip if recently checked
    if (now - ClaudeService.lastHealthCheck < HEALTH_CHECK_INTERVAL) {
      return ClaudeService.healthStatus !== 'unhealthy';
    }
    
    ClaudeService.lastHealthCheck = now;
    const healthCheckId = Math.random().toString(36).substring(2, 8);
    
    try {
      logger.info(`[ANTHROPIC_HEALTH_CHECK] Starting health check`, {
        healthCheckId,
        currentStatus: ClaudeService.healthStatus,
        consecutiveFailures: ClaudeService.consecutiveFailures
      });
      
      const startTime = Date.now();
      const message = await this.anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 10,
        temperature: 0,
        messages: [{ role: "user", content: "ping" }],
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = message.content[0]?.type === 'text';
      
      if (isHealthy) {
        ClaudeService.healthStatus = responseTime > 5000 ? 'degraded' : 'healthy';
        ClaudeService.consecutiveFailures = 0;
        
        logger.info(`[ANTHROPIC_HEALTH_CHECK] Health check passed`, {
          healthCheckId,
          status: ClaudeService.healthStatus,
          responseTimeMs: responseTime,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens
        });
      } else {
        throw new Error('Invalid response format');
      }
      
      return true;
    } catch (error) {
      ClaudeService.consecutiveFailures++;
      
      if (ClaudeService.consecutiveFailures >= 3) {
        ClaudeService.healthStatus = 'unhealthy';
      } else if (ClaudeService.consecutiveFailures >= 1) {
        ClaudeService.healthStatus = 'degraded';
      }
      
      logger.error(`[ANTHROPIC_HEALTH_CHECK] Health check failed`, error as Error, {
        healthCheckId,
        consecutiveFailures: ClaudeService.consecutiveFailures,
        newStatus: ClaudeService.healthStatus
      });
      
      return ClaudeService.healthStatus !== 'unhealthy';
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    const timeSinceLastRequest = now - ClaudeService.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.warn(`[ANTHROPIC_RATE_LIMIT] Enforcing rate limit`, {
        waitTimeMs: waitTime,
        minIntervalMs: this.minRequestInterval,
        timeSinceLastMs: timeSinceLastRequest,
        lastRequestTime: new Date(ClaudeService.lastRequestTime).toISOString(),
        healthStatus: ClaudeService.healthStatus
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    ClaudeService.lastRequestTime = Date.now();
  }

  protected async makeAIRequest(prompt: string): Promise<string> {
    const maxRetries = 4; // Increased retries
    let attempt = 0;
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();
    
    // Perform health check first
    const isHealthy = await this.performHealthCheck();
    
    logger.warn(`[ANTHROPIC_REQUEST_START] Starting Claude API request`, {
      requestId,
      promptLength: prompt.length,
      maxRetries,
      healthStatus: ClaudeService.healthStatus,
      consecutiveFailures: ClaudeService.consecutiveFailures,
      isHealthy,
      timestamp: new Date().toISOString()
    });
    
    // If unhealthy, use circuit breaker pattern
    if (!isHealthy) {
      logger.error(`[ANTHROPIC_CIRCUIT_BREAKER] API marked as unhealthy, rejecting request`, undefined, {
        requestId,
        healthStatus: ClaudeService.healthStatus,
        consecutiveFailures: ClaudeService.consecutiveFailures
      });
      throw new Error(`Anthropic API is unhealthy (${ClaudeService.healthStatus}) - circuit breaker activated`);
    }
    
    while (attempt < maxRetries) {
      const attemptStartTime = Date.now();
      try {
        // Enable rate limiting in production
        // await this.enforceRateLimit();
        
        // Dynamic model selection based on health status
        const model = ClaudeService.healthStatus === 'degraded' 
          ? "claude-3-5-haiku-20241022" // Faster model when degraded
          : "claude-haiku-4-5";
        
        const maxTokens = ClaudeService.healthStatus === 'degraded' ? 3000 : 4000;
        
        logger.warn(`[ANTHROPIC_API_CALL] Making API call to Claude`, {
          requestId,
          attempt: attempt + 1,
          maxRetries,
          model,
          maxTokens,
          temperature: 0.3,
          healthStatus: ClaudeService.healthStatus,
          promptSize: `${Math.round(prompt.length / 1024)}KB`
        });
        
        // Add timeout wrapper
        const apiCallPromise = this.anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('API request timeout')), 45000); // 45s timeout
        });
        
        const message = await Promise.race([apiCallPromise, timeoutPromise]);
        
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
        
        // Reset failure counter on success
        ClaudeService.consecutiveFailures = 0;
        
        logger.warn(`[ANTHROPIC_REQUEST_SUCCESS] Claude API request successful`, {
          requestId,
          attempt: attempt + 1,
          responseLength: response.text.length,
          attemptTimeMs: attemptTime,
          totalTimeMs: totalTime,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens,
          tokensPerSecond: message.usage?.output_tokens ? Math.round(message.usage.output_tokens / (attemptTime / 1000)) : null,
          healthStatus: ClaudeService.healthStatus
        });

        return response.text;
      } catch (error: unknown) {
        attempt++;
        const attemptTime = Date.now() - attemptStartTime;
        const apiError = error as { error?: { type?: string; message?: string }; status?: number };
        const errorMessage = apiError?.error?.message || (error as Error).message;
        const errorType = apiError?.error?.type || 'unknown';
        const statusCode = apiError?.status;
        
        // Track consecutive failures
        ClaudeService.consecutiveFailures++;
        
        logger.warn(`[ANTHROPIC_REQUEST_ERROR] Claude API request failed`, {
          requestId,
          attempt,
          maxRetries,
          attemptTimeMs: attemptTime,
          errorType,
          errorMessage,
          statusCode,
          consecutiveFailures: ClaudeService.consecutiveFailures,
          healthStatus: ClaudeService.healthStatus
        });
        
        // Determine if should retry
        const isRetryableError = this.isRetryableError(error as Error, errorType, statusCode);
        const isLastAttempt = attempt >= maxRetries;
        
        if (!isRetryableError || isLastAttempt) {
          logger.error(`[ANTHROPIC_REQUEST_FAILED] Claude API request failed permanently`, error as Error, {
            requestId,
            finalAttempt: attempt,
            totalTimeMs: Date.now() - requestStartTime,
            isRetryableError,
            isLastAttempt,
            consecutiveFailures: ClaudeService.consecutiveFailures
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
      consecutiveFailures: ClaudeService.consecutiveFailures,
      finalHealthStatus: ClaudeService.healthStatus
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

  /**
   * Get current health status for monitoring
   */
  static getHealthStatus() {
    return {
      status: ClaudeService.healthStatus,
      consecutiveFailures: ClaudeService.consecutiveFailures,
      lastHealthCheck: new Date(ClaudeService.lastHealthCheck).toISOString(),
      lastRequestTime: new Date(ClaudeService.lastRequestTime).toISOString()
    };
  }

  // Enhanced analysis with screenshot support
  async analyzeWithScreenshot(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    try {
      if (!websiteData.screenshot) {
        logger.debug(`[ANTHROPIC_SCREENSHOT] No screenshot available, falling back to text-only analysis`, {
          requestId,
          url: websiteData.url,
          analysisType
        });
        return this.analyzeWebsite(websiteData, analysisType, prompt);
      }

      logger.warn(`[ANTHROPIC_SCREENSHOT_START] Starting Claude analysis with screenshot`, {
        requestId,
        analysisType,
        url: websiteData.url,
        screenshotSize: websiteData.screenshot.length,
        timestamp: new Date().toISOString()
      });
      
      const fullPrompt = this.buildPrompt(websiteData, prompt);
      
      await this.enforceRateLimit();
      
      logger.debug(`[ANTHROPIC_SCREENSHOT_API] Making multimodal API call to Claude`, {
        requestId,
        model: "claude-haiku-4-5",
        maxTokens: 3000,
        hasImage: true,
        promptLength: fullPrompt.length
      });
      
      const message = await this.anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 3000,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: websiteData.screenshot.toString('base64')
                }
              }
            ]
          }
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const result = this.parseAIResponse(response.text);
      const analysisTime = Date.now() - startTime;
      
      logger.warn(`[ANTHROPIC_SCREENSHOT_SUCCESS] Claude analysis with screenshot completed`, {
        requestId,
        analysisType,
        url: websiteData.url,
        score: result.score,
        insightsCount: result.insights.length,
        recommendationsCount: result.recommendations.length,
        analysisTimeMs: analysisTime,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens
      });
      
      return result;
    } catch (error) {
      const analysisTime = Date.now() - startTime;
      logger.error(`[ANTHROPIC_SCREENSHOT_ERROR] Claude analysis with screenshot failed, falling back to text-only`, error as Error, {
        requestId,
        analysisType,
        url: websiteData.url,
        analysisTimeMs: analysisTime
      });
      // Fallback to text-only analysis
      return this.analyzeWebsite(websiteData, analysisType, prompt);
    }
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
  async makeRequest(prompt: string): Promise<string> {
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();
    
    try {
      logger.debug(`[QUEUED_CLAUDE] Making direct API call`, {
        requestId,
        promptLength: prompt.length,
        model: "claude-haiku-4-5"
      });
      
      const message = await this.anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const totalTime = Date.now() - requestStartTime;
      
      logger.info(`[QUEUED_CLAUDE] API request successful`, {
        requestId,
        responseLength: response.text.length,
        totalTimeMs: totalTime,
        inputTokens: message.usage?.input_tokens,
        outputTokens: message.usage?.output_tokens
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
  protected async makeAIRequest(prompt: string): Promise<string> {
    if (!QueuedClaudeService.globalQueue) {
      throw new Error('AI request queue not initialized');
    }
    
    logger.debug(`[QUEUED_CLAUDE] Submitting request to queue`);
    return QueuedClaudeService.globalQueue.enqueueRequest(prompt);
  }

  // Get queue status for monitoring
  static getQueueStatus() {
    return QueuedClaudeService.globalQueue?.getStatus() || null;
  }

  // Clear queue (useful for testing)
  static clearQueue() {
    QueuedClaudeService.globalQueue?.clear();
  }

  // Enhanced analysis with screenshot support (same as ClaudeService)
  async analyzeWithScreenshot(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    
    try {
      if (!websiteData.screenshot) {
        logger.debug(`[QUEUED_CLAUDE_SCREENSHOT] No screenshot available, falling back to text-only analysis`, {
          requestId,
          url: websiteData.url,
          analysisType
        });
        return this.analyzeWebsite(websiteData, analysisType, prompt);
      }

      logger.warn(`[QUEUED_CLAUDE_SCREENSHOT] Starting screenshot-enhanced analysis`, {
        requestId,
        url: websiteData.url,
        analysisType,
        screenshotSize: websiteData.screenshot.length
      });

      // Use screenshot analysis - delegate to queue
      const enhancedPrompt = this.buildPromptWithScreenshot(websiteData, prompt);
      const response = await this.makeAIRequest(enhancedPrompt);
      const result = this.parseAIResponse(response);
      
      const analysisTime = Date.now() - startTime;
      logger.warn(`[QUEUED_CLAUDE_SCREENSHOT] Screenshot-enhanced analysis completed`, {
        requestId,
        url: websiteData.url,
        analysisType,
        score: result.score,
        analysisTimeMs: analysisTime
      });
      
      return result;
    } catch (error) {
      const analysisTime = Date.now() - startTime;
      logger.error(`[QUEUED_CLAUDE_SCREENSHOT] Screenshot analysis failed, falling back to text-only`, error as Error, {
        requestId,
        url: websiteData.url,
        analysisType,
        analysisTimeMs: analysisTime
      });
      // Fallback to text-only analysis
      return this.analyzeWebsite(websiteData, analysisType, prompt);
    }
  }

  private buildPromptWithScreenshot(websiteData: WebsiteData, specificPrompt: string): string {
    // For now, fall back to text-only since multimodal requires different API handling
    return this.buildPrompt(websiteData, specificPrompt);
  }
}

// OpenAI Service Implementation
export class OpenAIService extends AIService {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    super();
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  protected async makeAIRequest(prompt: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert marketing analyst and web performance specialist. Provide thorough, actionable analysis in the exact JSON format requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return response;
    } catch (error) {
      logger.error('OpenAI API request failed:', error as Error);
      throw error;
    }
  }

  // Enhanced analysis with screenshot support
  async analyzeWithScreenshot(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    try {
      if (!websiteData.screenshot) {
        return this.analyzeWebsite(websiteData, analysisType, prompt);
      }

      logger.debug(`Starting AI analysis with screenshot for ${analysisType} on ${websiteData.url}`);
      
      const fullPrompt = this.buildPrompt(websiteData, prompt);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert marketing analyst and web performance specialist. Analyze both the website data and the screenshot to provide comprehensive insights."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${websiteData.screenshot.toString('base64')}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const result = this.parseAIResponse(response);
      logger.debug(`Completed AI analysis with screenshot for ${analysisType} on ${websiteData.url}`);
      
      return result;
    } catch (error) {
      logger.error(`AI analysis with screenshot failed for ${analysisType}:`, error as Error);
      // Fallback to text-only analysis
      return this.analyzeWebsite(websiteData, analysisType, prompt);
    }
  }
}

// Mock AI Service for development/testing
export class MockAIService extends AIService {
  protected async makeAIRequest(prompt: string): Promise<string> {
    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if this is a comprehensive analysis request
    if (prompt.includes('Comprehensive Website Analysis')) {
      return JSON.stringify({
        seo: {
          structuredData: Math.random() > 0.5,
          metaTagsComplete: Math.random() > 0.3,
          headingStructure: Math.random() > 0.4
        },
        accessibility: {
          score: Math.floor(Math.random() * 40) + 60,
          issues: [
            "Some images missing alt text",
            "Form elements could use better labeling"
          ]
        },
        performance: {
          coreWebVitals: {
            lcp: Math.floor(Math.random() * 2000) + 1500,
            fid: Math.floor(Math.random() * 50) + 25,
            cls: Math.round((Math.random() * 0.2 + 0.05) * 100) / 100
          },
          loadingMetrics: {
            domContentLoaded: Math.floor(Math.random() * 1000) + 500,
            firstContentfulPaint: Math.floor(Math.random() * 800) + 400,
            largestContentfulPaint: Math.floor(Math.random() * 1500) + 1000
          },
          networkMetrics: {
            requestCount: Math.floor(Math.random() * 20) + 10,
            transferSize: Math.floor(Math.random() * 2000000) + 500000,
            resourceLoadTime: Math.floor(Math.random() * 500) + 300
          }
        }
      });
    }
    
    // Return a mock response based on the prompt content for other analysis types
    const analysisType = this.extractAnalysisType(prompt);
    
    return JSON.stringify({
      score: Math.floor(Math.random() * 40) + 50, // Random score between 50-90
      insights: [
        `${analysisType} analysis shows good foundational elements`,
        `Some areas could benefit from optimization`,
        `Overall structure is well organized`
      ],
      recommendations: [
        `Consider improving ${analysisType.toLowerCase()} messaging clarity`,
        `Add more compelling content in key areas`,
        `Test different approaches to optimize performance`
      ]
    });
  }

  private extractAnalysisType(prompt: string): string {
    if (prompt.includes('value proposition')) return 'Value Proposition';
    if (prompt.includes('features') || prompt.includes('benefits')) return 'Features & Benefits';
    if (prompt.includes('call-to-action') || prompt.includes('CTA')) return 'Call-to-Action';
    if (prompt.includes('SEO')) return 'SEO';
    if (prompt.includes('trust')) return 'Trust Signals';
    return 'General';
  }
}