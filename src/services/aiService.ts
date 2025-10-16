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


  protected summarizeContent(content: string, maxLength: number = 3000): string {
    if (content.length <= maxLength) return content;
    
    // Extract key sections: headings, form labels, button text, links
    const keyPatterns = [
      /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi,
      /<title[^>]*>([^<]+)<\/title>/gi,
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/gi,
      /<button[^>]*>([^<]+)<\/button>/gi,
      /<a[^>]*>([^<]+)<\/a>/gi,
      /<label[^>]*>([^<]+)<\/label>/gi,
      /<input[^>]*placeholder=["']([^"']+)["']/gi
    ];
    
    const extractedContent: string[] = [];
    keyPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null && extractedContent.length < 100) {
        extractedContent.push(match[1].trim());
      }
    });
    
    const summarized = extractedContent.join(' | ');
    return summarized.length > maxLength ? summarized.substring(0, maxLength) + '...' : summarized;
  }


  protected buildPrompt(
    websiteData: WebsiteData, 
    specificPrompt: string
  ): string {
    // Build comprehensive website analysis data
    const performanceData = websiteData.performance ? `
Core Web Vitals:
- LCP (Largest Contentful Paint): ${websiteData.performance.coreWebVitals.lcp}ms
- FID (First Input Delay): ${websiteData.performance.coreWebVitals.fid}ms  
- CLS (Cumulative Layout Shift): ${websiteData.performance.coreWebVitals.cls}

Loading Metrics:
- DOM Content Loaded: ${websiteData.performance.loadingMetrics.domContentLoaded}ms
- First Contentful Paint: ${websiteData.performance.loadingMetrics.firstContentfulPaint}ms
- Largest Contentful Paint: ${websiteData.performance.loadingMetrics.largestContentfulPaint}ms

Network Metrics:
- Request Count: ${websiteData.performance.networkMetrics.requestCount}
- Transfer Size: ${Math.round(websiteData.performance.networkMetrics.transferSize / 1024)}KB
- Resource Load Time: ${websiteData.performance.networkMetrics.resourceLoadTime}ms` : '';

    const seoData = websiteData.seo ? `
SEO Analysis:
- Structured Data Present: ${websiteData.seo.structuredData ? 'Yes' : 'No'}
- Meta Tags Complete: ${websiteData.seo.metaTagsComplete ? 'Yes' : 'No'}
- Proper Heading Structure: ${websiteData.seo.headingStructure ? 'Yes' : 'No'}` : '';

    const accessibilityData = websiteData.accessibility ? `
Accessibility Analysis:
- Accessibility Score: ${websiteData.accessibility.score}/100
- Issues Found: ${websiteData.accessibility.issues.length > 0 ? websiteData.accessibility.issues.join(', ') : 'None'}` : '';

    return `
You are an expert marketing analyst and web performance specialist evaluating a website. 

STEP 1: BUSINESS CONTEXT ANALYSIS
First, analyze the website data below to determine:
- Industry type and business model
- Target audience and customer segments  
- Primary business goals and objectives
- Appropriate industry standards and best practices

STEP 2: DETAILED EVALUATION
Then use this context to evaluate the specific area requested.

WEBSITE TECHNICAL DATA:
Website URL: ${websiteData.url}
Page Title: ${websiteData.metadata.title}
Meta Description: ${websiteData.metadata.description}
H1 Tags: ${websiteData.metadata.h1Tags.join(', ')}
Keywords: ${websiteData.metadata.keywords.join(', ')}
Number of Forms: ${websiteData.metadata.forms}
Number of Images: ${websiteData.metadata.images.length}
Number of Links: ${websiteData.metadata.links.length}
Load Time: ${websiteData.metadata.loadTime}ms

${performanceData}

${seoData}

${accessibilityData}

CONTENT ANALYSIS:
Key Content: ${this.summarizeContent(websiteData.html, 2000)}

EVALUATION TASK:
${specificPrompt}

Please provide a comprehensive analysis considering:
1. The business context and industry standards you identified
2. Target audience expectations and needs  
3. Industry-specific best practices
4. Current performance metrics and technical factors
5. Content quality and messaging effectiveness

Respond in the following JSON format with detailed, actionable insights:
{
  "context": {
    "industry": "<detected industry>",
    "businessType": "<business model type>",
    "targetAudience": "<primary target audience>",
    "primaryGoal": "<main business objective>"
  },
  "score": <number between 0-100>,
  "insights": [
    "Primary insight with specific details",
    "Secondary insight with contextual analysis", 
    "Technical insight with performance implications",
    "Content insight with messaging evaluation",
    "Industry-specific insight with competitive context"
  ],
  "recommendations": [
    "High-priority recommendation with implementation approach",
    "Medium-priority recommendation with expected impact",
    "Technical recommendation with specific fixes",
    "Content recommendation with messaging improvements", 
    "Strategic recommendation for long-term optimization"
  ]
}

Ensure all insights and recommendations are:
- Specific and actionable
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

  constructor(apiKey?: string) {
    super();
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
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
        lastRequestTime: new Date(ClaudeService.lastRequestTime).toISOString()
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    ClaudeService.lastRequestTime = Date.now();
  }

  protected async makeAIRequest(prompt: string): Promise<string> {
    const maxRetries = 3;
    let attempt = 0;
    const requestId = Math.random().toString(36).substring(2, 15);
    const requestStartTime = Date.now();
    
    logger.warn(`[ANTHROPIC_REQUEST_START] Starting Claude API request`, {
      requestId,
      promptLength: prompt.length,
      maxRetries,
      timestamp: new Date().toISOString()
    });
    
    while (attempt < maxRetries) {
      const attemptStartTime = Date.now();
      try {
       // await this.enforceRateLimit();
        
        logger.warn(`[ANTHROPIC_API_CALL] Making API call to Claude`, {
          requestId,
          attempt: attempt + 1,
          maxRetries,
          model: "claude-haiku-4-5",
          maxTokens: 4000,
          temperature: 0.3
        });
        
        const message = await this.anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 4000, // Reduced to help with rate limits
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

        const attemptTime = Date.now() - attemptStartTime;
        const totalTime = Date.now() - requestStartTime;
        
        logger.warn(`[ANTHROPIC_REQUEST_SUCCESS] Claude API request successful`, {
          requestId,
          attempt: attempt + 1,
          responseLength: response.text.length,
          attemptTimeMs: attemptTime,
          totalTimeMs: totalTime,
          inputTokens: message.usage?.input_tokens,
          outputTokens: message.usage?.output_tokens
        });

        return response.text;
      } catch (error: unknown) {
        attempt++;
        const attemptTime = Date.now() - attemptStartTime;
        const apiError = error as { error?: { type?: string; message?: string } };
        
        logger.warn(`[ANTHROPIC_REQUEST_ERROR] Claude API request failed`, {
          requestId,
          attempt,
          maxRetries,
          attemptTimeMs: attemptTime,
          errorType: apiError?.error?.type || 'unknown',
          errorMessage: apiError?.error?.message || (error as Error).message
        });
        
        // Check if it's a rate limit error
        if (apiError?.error?.type === 'rate_limit_error' && attempt < maxRetries) {
          const backoffTime = Math.pow(2, attempt) * 5000; // Exponential backoff: 5s, 10s, 20s
          logger.warn(`[ANTHROPIC_RETRY] Rate limit hit, retrying with backoff`, {
            requestId,
            attempt,
            maxRetries,
            backoffTimeMs: backoffTime
          });
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        }
        
        logger.error(`[ANTHROPIC_REQUEST_FAILED] Claude API request failed permanently`, error as Error, {
          requestId,
          finalAttempt: attempt,
          totalTimeMs: Date.now() - requestStartTime
        });
        throw error;
      }
    }
    
    const totalTime = Date.now() - requestStartTime;
    logger.error(`[ANTHROPIC_MAX_RETRIES] Max retries exceeded for Claude API request`, undefined, {
      requestId,
      maxRetries,
      totalTimeMs: totalTime
    });
    throw new Error('Max retries exceeded for Claude API request');
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
        model: "claude-3-5-haiku-latest",
        maxTokens: 3000,
        hasImage: true,
        promptLength: fullPrompt.length
      });
      
      const message = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
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
        model: "claude-3-5-haiku-latest"
      });
      
      const message = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-latest",
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