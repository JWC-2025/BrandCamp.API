"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAIService = exports.OpenAIService = exports.ClaudeService = exports.AIService = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("../utils/logger");
class AIService {
    async analyzeWebsite(websiteData, analysisType, prompt) {
        try {
            logger_1.logger.debug(`Starting AI analysis for ${analysisType} on ${websiteData.url}`);
            const fullPrompt = this.buildPrompt(websiteData, prompt);
            const response = await this.makeAIRequest(fullPrompt);
            const result = this.parseAIResponse(response);
            logger_1.logger.debug(`Completed AI analysis for ${analysisType} on ${websiteData.url}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`AI analysis failed for ${analysisType}:`, error);
            return this.getFallbackResult(analysisType);
        }
    }
    buildPrompt(websiteData, specificPrompt) {
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
You are an expert marketing analyst and web performance specialist evaluating a website. Please analyze the following comprehensive website data and provide your assessment.

Website URL: ${websiteData.url}
Page Title: ${websiteData.metadata.title}
Meta Description: ${websiteData.metadata.description}
H1 Tags: ${websiteData.metadata.h1Tags.join(', ')}
Number of Forms: ${websiteData.metadata.forms}
Number of Images: ${websiteData.metadata.images.length}
Number of Links: ${websiteData.metadata.links.length}
Load Time: ${websiteData.metadata.loadTime}ms

${performanceData}

${seoData}

${accessibilityData}

HTML Content Preview: ${websiteData.html.substring(0, 2000)}...

${specificPrompt}

Please respond in the following JSON format:
{
  "score": <number between 0-100>,
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"]
}

Make sure your response is valid JSON and nothing else.
`;
    }
    parseAIResponse(response) {
        try {
            const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanedResponse);
            return {
                score: Math.max(0, Math.min(100, parsed.score || 0)),
                insights: Array.isArray(parsed.insights) ? parsed.insights : [],
                recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            };
        }
        catch (error) {
            logger_1.logger.warn('Failed to parse AI response, using fallback');
            return {
                score: 50,
                insights: ['Unable to generate insights due to parsing error'],
                recommendations: ['Please review the website manually'],
            };
        }
    }
    getFallbackResult(analysisType) {
        return {
            score: 50,
            insights: [`${analysisType} analysis unavailable - manual review recommended`],
            recommendations: [`Please review ${analysisType} manually`],
        };
    }
}
exports.AIService = AIService;
class ClaudeService extends AIService {
    constructor(apiKey) {
        super();
        this.anthropic = new sdk_1.default({
            apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
        });
    }
    async makeAIRequest(prompt) {
        try {
            const message = await this.anthropic.messages.create({
                model: "claude-3-5-haiku-20241022",
                max_tokens: 1000,
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
        }
        catch (error) {
            logger_1.logger.error('Claude API request failed:', error);
            throw error;
        }
    }
    async analyzeWithScreenshot(websiteData, analysisType, prompt) {
        try {
            if (!websiteData.screenshot) {
                return this.analyzeWebsite(websiteData, analysisType, prompt);
            }
            logger_1.logger.debug(`Starting Claude analysis with screenshot for ${analysisType} on ${websiteData.url}`);
            const fullPrompt = this.buildPrompt(websiteData, prompt);
            const message = await this.anthropic.messages.create({
                model: "claude-3-5-haiku-20241022",
                max_tokens: 1000,
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
            logger_1.logger.debug(`Completed Claude analysis with screenshot for ${analysisType} on ${websiteData.url}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Claude analysis with screenshot failed for ${analysisType}:`, error);
            return this.analyzeWebsite(websiteData, analysisType, prompt);
        }
    }
}
exports.ClaudeService = ClaudeService;
class OpenAIService extends AIService {
    constructor(apiKey) {
        super();
        this.openai = new openai_1.default({
            apiKey: apiKey || process.env.OPENAI_API_KEY,
        });
    }
    async makeAIRequest(prompt) {
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
                max_tokens: 1000,
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }
            return response;
        }
        catch (error) {
            logger_1.logger.error('OpenAI API request failed:', error);
            throw error;
        }
    }
    async analyzeWithScreenshot(websiteData, analysisType, prompt) {
        try {
            if (!websiteData.screenshot) {
                return this.analyzeWebsite(websiteData, analysisType, prompt);
            }
            logger_1.logger.debug(`Starting AI analysis with screenshot for ${analysisType} on ${websiteData.url}`);
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
                max_tokens: 1000,
            });
            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from OpenAI');
            }
            const result = this.parseAIResponse(response);
            logger_1.logger.debug(`Completed AI analysis with screenshot for ${analysisType} on ${websiteData.url}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error(`AI analysis with screenshot failed for ${analysisType}:`, error);
            return this.analyzeWebsite(websiteData, analysisType, prompt);
        }
    }
}
exports.OpenAIService = OpenAIService;
class MockAIService extends AIService {
    async makeAIRequest(prompt) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const analysisType = this.extractAnalysisType(prompt);
        return JSON.stringify({
            score: Math.floor(Math.random() * 40) + 50,
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
    extractAnalysisType(prompt) {
        if (prompt.includes('value proposition'))
            return 'Value Proposition';
        if (prompt.includes('features') || prompt.includes('benefits'))
            return 'Features & Benefits';
        if (prompt.includes('call-to-action') || prompt.includes('CTA'))
            return 'Call-to-Action';
        if (prompt.includes('SEO'))
            return 'SEO';
        if (prompt.includes('trust'))
            return 'Trust Signals';
        return 'General';
    }
}
exports.MockAIService = MockAIService;
//# sourceMappingURL=aiService.js.map