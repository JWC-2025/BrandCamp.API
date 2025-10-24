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
  
  async analyzeWebsite(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    try {

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
- Use your built-in web fetch tool to retrieve the website content
- Extract HTML, meta tags, headings, content, and structure information
- If the website fetch fails or times out, provide analysis based on the URL and domain patterns
- For timeouts or large files, focus on analyzing what can be inferred from the domain/URL
- Always provide a score and analysis even if website fetch partially fails

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
      score: 0,
      insights: [`${analysisType} analysis unavailable - manual review recommended`],
      recommendations: [`Please review ${analysisType} manually`],
    };
  }

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
}

// Claude AI Service Implementation
export class ClaudeService extends AIService {
  private anthropic: Anthropic;
  private static consecutiveFailures = 0;

  constructor(apiKey?: string) {
    super();
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  protected async makeAIRequest(prompt: string): Promise<string> {
    const maxRetries = 1; 
    let attempt = 0;
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();

    
    while (attempt < maxRetries) {
      const attemptStartTime = Date.now();
      try {
        
        logger.warn(`[ANTHROPIC_API_CALL] Making API call to Claude`);
        
        // Add timeout wrapper
        const apiCallPromise = this.anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          temperature: 0.3,
          tools: [
                    {
                      name: "web_fetch",
                      description: "Fetches website content",
                      input_schema: {
                        type: "object",
                        properties: {
                          url: {
                            type: "string",
                            description: "The URL of the website to fetch"
                          }
                        },
                        required: ["url"]
                      }
                    }
                  ],
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
        });
        
        // Longer timeout for web fetch operations (detect from prompt content)
        const isWebFetchOperation = prompt.includes('WEBSITE DATA COLLECTION') || prompt.includes('web fetch tool');
        const timeoutMs = isWebFetchOperation ? 120000 : 45000; // 2 minutes for web fetch, 45s for normal
        
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('API request timeout')), timeoutMs);
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
          tokensPerSecond: message.usage?.output_tokens ? Math.round(message.usage.output_tokens / (attemptTime / 1000)) : null
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
          consecutiveFailures: ClaudeService.consecutiveFailures
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
  async makeRequest(prompt: string): Promise<string> {
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();
    
    try {
      logger.debug(`[QUEUED_CLAUDE] Making direct API call`, {
        requestId,
        promptLength: prompt.length,
        model: "claude-sonnet-4-5-20250929"
      });
      
      const message = await this.anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        temperature: 0.3,
        tools: [
          {
            name: "web_fetch",
            description: "Fetches website content",
            input_schema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL of the website to fetch"
                }
              },
              required: ["url"]
            }
          }
        ],
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
}