import { WebsiteData } from './audit';
export interface EvaluationResult {
    score: number;
    insights: string[];
    recommendations: string[];
}
export interface Evaluator {
    name: string;
    evaluate(websiteData: WebsiteData): Promise<EvaluationResult>;
}
export interface AIServiceConfig {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
    maxTokens: number;
}
