import { WebsiteData } from '../types/audit';
export interface AIAnalysisResult {
    score: number;
    insights: string[];
    recommendations: string[];
}
export declare abstract class AIService {
    protected abstract makeAIRequest(prompt: string): Promise<string>;
    analyzeWebsite(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult>;
    private performPreliminaryAnalysis;
    protected buildEnhancedPrompt(websiteData: WebsiteData, analysisType: string, specificPrompt: string, context: {
        industry: string;
        businessType: string;
        targetAudience: string;
        primaryGoal: string;
    }): string;
    protected buildPrompt(websiteData: WebsiteData, specificPrompt: string, context?: {
        industry: string;
        businessType: string;
        targetAudience: string;
        primaryGoal: string;
    }, industryPrompt?: string): string;
    protected parseAIResponse(response: string): AIAnalysisResult;
    protected getFallbackResult(analysisType: string): AIAnalysisResult;
}
export declare class ClaudeService extends AIService {
    private anthropic;
    constructor(apiKey?: string);
    protected makeAIRequest(prompt: string): Promise<string>;
    analyzeWithScreenshot(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult>;
}
export declare class OpenAIService extends AIService {
    private openai;
    constructor(apiKey?: string);
    protected makeAIRequest(prompt: string): Promise<string>;
    analyzeWithScreenshot(websiteData: WebsiteData, analysisType: string, prompt: string): Promise<AIAnalysisResult>;
}
export declare class MockAIService extends AIService {
    protected makeAIRequest(prompt: string): Promise<string>;
    private extractAnalysisType;
}
