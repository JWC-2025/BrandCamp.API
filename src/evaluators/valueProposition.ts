import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService, MockAIService } from '../services/aiService';
import { config } from '../config/environment';

export class ValuePropositionEvaluator implements Evaluator {
  name = 'Value Proposition';
  private aiService: ClaudeService | MockAIService;

  constructor() {
    // Use Claude service in production, MockAI in development without API key
    this.aiService = config.ai.anthropicApiKey 
      ? new ClaudeService(config.ai.anthropicApiKey)
      : new MockAIService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Analyze the value proposition of this website. Consider the following criteria:

1. Clarity of the main value proposition
2. Uniqueness and differentiation from competitors
3. Relevance to target audience
4. Prominence and placement on the page
5. Supporting evidence and proof points

Focus on:
- How clearly the website communicates what they do
- What makes them different/better than alternatives
- Whether the value is immediately apparent to visitors
- The strength of the headline and supporting copy
- Overall messaging effectiveness

Rate the value proposition strength on a scale of 0-100.
    `;

    // Use screenshot analysis if available and using Claude
    const result = this.aiService instanceof ClaudeService && websiteData.screenshot
      ? await this.aiService.analyzeWithScreenshot(websiteData, this.name, prompt)
      : await this.aiService.analyzeWebsite(websiteData, this.name, prompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}