import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { OpenAIService } from '../services/aiService';
import { config } from '../config/environment';

export class FeaturesAndBenefitsEvaluator implements Evaluator {
  name = 'Features and Benefits';
  private aiService: OpenAIService;

  constructor() {
    this.aiService = new OpenAIService(config.ai.openaiApiKey)
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Analyze how well the provided HTML content presents its features and benefits. Consider:

1. Clear presentation of key features
2. Translation of features into customer benefits
3. Organization and readability of feature/benefit content
4. Use of supporting visuals or examples
5. Logical flow and hierarchy of information

Focus on:
- Whether features are clearly explained
- How well features are connected to customer value/benefits
- Visual presentation and scannability
- Completeness of information
- Persuasiveness of benefit messaging

Rate the features and benefits presentation on a scale of 0-100.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}