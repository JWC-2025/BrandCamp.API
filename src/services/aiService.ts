import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { WebsiteData } from '../types/audit';
import { logger } from '../utils/logger';
import { detectIndustry, getIndustryPrompt } from './promptTemplates';

export interface AIAnalysisResult {
  score: number;
  insights: string[];
  recommendations: string[];
}

export abstract class AIService {
  protected abstract makeAIRequest(prompt: string): Promise<string>;

  async analyzeWebsite(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    try {
      logger.debug(`Starting AI analysis for ${analysisType} on ${websiteData.url}`);
      
      // Multi-stage evaluation: preliminary assessment then detailed analysis
      const preliminaryResult = await this.performPreliminaryAnalysis(websiteData);
      const fullPrompt = this.buildEnhancedPrompt(websiteData, analysisType, prompt, preliminaryResult);
      const response = await this.makeAIRequest(fullPrompt);
      console.log('AIResponse ' + response);
      const result = this.parseAIResponse(response);
      logger.debug(`Completed AI analysis for ${analysisType} on ${websiteData.url}`);
      
      return result;
    } catch (error) {
      logger.error(`AI analysis failed for ${analysisType}:`, error as Error);
      // Return fallback result instead of throwing
      return this.getFallbackResult(analysisType);
    }
  }

  private async performPreliminaryAnalysis(websiteData: WebsiteData): Promise<{
    industry: string;
    businessType: string;
    targetAudience: string;
    primaryGoal: string;
  }> {
    try {
      const preliminaryPrompt = `
      Quickly analyze this website to understand:
      1. Industry/business type
      2. Target audience
      3. Primary business goal (lead generation, sales, information, etc.)
      
      Website: ${websiteData.url}
      Title: ${websiteData.metadata.title}
      Description: ${websiteData.metadata.description}
      Content preview: ${websiteData.html.substring(0, 1500)}...
      
      Respond in JSON format:
      {
        "industry": "detected industry",
        "businessType": "business model type", 
        "targetAudience": "primary target audience",
        "primaryGoal": "main website objective"
      }
      `;
      
      const response = await this.makeAIRequest(preliminaryPrompt);
      const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim());
      
      return {
        industry: parsed.industry || detectIndustry(websiteData),
        businessType: parsed.businessType || 'general',
        targetAudience: parsed.targetAudience || 'general audience',
        primaryGoal: parsed.primaryGoal || 'business objective'
      };
    } catch {
      // Fallback to keyword-based detection
      return {
        industry: detectIndustry(websiteData),
        businessType: 'general',
        targetAudience: 'general audience', 
        primaryGoal: 'business objective'
      };
    }
  }

  protected buildEnhancedPrompt(
    websiteData: WebsiteData, 
    analysisType: string, 
    specificPrompt: string, 
    context: { industry: string; businessType: string; targetAudience: string; primaryGoal: string }
  ): string {
    // Get industry-specific guidance
    const industryPrompt = getIndustryPrompt(context.industry, analysisType);
    
    return this.buildPrompt(websiteData, specificPrompt, context, industryPrompt);
  }

  protected buildPrompt(
    websiteData: WebsiteData, 
    specificPrompt: string, 
    context?: { industry: string; businessType: string; targetAudience: string; primaryGoal: string },
    industryPrompt?: string
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

    const contextSection = context ? `
BUSINESS CONTEXT ANALYSIS:
- Industry: ${context.industry}
- Business Type: ${context.businessType}
- Target Audience: ${context.targetAudience}
- Primary Goal: ${context.primaryGoal}

This context should inform your evaluation criteria and recommendations.
` : '';

    const industrySection = industryPrompt ? `
INDUSTRY-SPECIFIC EVALUATION CRITERIA:
${industryPrompt}

Apply these industry-specific considerations in your analysis.
` : '';

    return `
You are an expert marketing analyst and web performance specialist evaluating a website. Please analyze the following comprehensive website data and provide your assessment.

${contextSection}

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

${industrySection}

CONTENT ANALYSIS:
Full HTML Content: ${websiteData.html.substring(0, 6000)}...

EVALUATION TASK:
${specificPrompt}

Please provide a comprehensive analysis considering:
1. The business context and industry standards
2. Target audience expectations and needs  
3. Industry-specific best practices
4. Current performance metrics and technical factors
5. Content quality and messaging effectiveness

Respond in the following JSON format with detailed, actionable insights:
{
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
- Contextually relevant to the industry and business type
- Backed by observable data from the website analysis
- Prioritized by potential impact and implementation difficulty

Make sure your response is valid JSON and nothing else.
`;
  }

  protected parseAIResponse(response: string): AIAnalysisResult {
    try {
      // Clean the response - remove any markdown formatting or extra text
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
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

  constructor(apiKey?: string) {
    super();
    this.anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  protected async makeAIRequest(prompt: string): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
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

      return response.text;
    } catch (error) {
      logger.error('Claude API request failed:', error as Error);
      throw error;
    }
  }

  // Enhanced analysis with screenshot support
  async analyzeWithScreenshot(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult> {
    try {
      if (!websiteData.screenshot) {
        return this.analyzeWebsite(websiteData, analysisType, prompt);
      }

      logger.debug(`Starting Claude analysis with screenshot for ${analysisType} on ${websiteData.url}`);
      
      const fullPrompt = this.buildPrompt(websiteData, prompt);
      
      const message = await this.anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4000,
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
      logger.debug(`Completed Claude analysis with screenshot for ${analysisType} on ${websiteData.url}`);
      
      return result;
    } catch (error) {
      logger.error(`Claude analysis with screenshot failed for ${analysisType}:`, error as Error);
      // Fallback to text-only analysis
      return this.analyzeWebsite(websiteData, analysisType, prompt);
    }
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