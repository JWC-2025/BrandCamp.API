import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { OpenAIService } from '../services/aiService';
import { config } from '../config/environment';

export class CTAAnalysisEvaluator implements Evaluator {
  name = 'Call-to-Action Analysis';
  private aiService: OpenAIService;

  constructor() {
    this.aiService = new OpenAIService(config.ai.openaiApiKey)
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Analyze the call-to-action (CTA) elements on the provided HTML. Consider:

1. Presence and visibility of primary CTAs
2. Clarity and action-oriented language
3. Strategic placement throughout the page
4. Visual design and contrast
5. Logical flow toward conversion

Focus on:
- How many CTAs are present and their prominence
- Whether CTA text is compelling and clear
- Button design, colors, and visual hierarchy
- Placement in relation to value propositions
- Overall conversion optimization
- Forms and lead capture mechanisms

Rate the CTA effectiveness on a scale of 0-100.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}