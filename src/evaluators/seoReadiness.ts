import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService, MockAIService } from '../services/aiService';
import { config } from '../config/environment';

export class SEOReadinessEvaluator implements Evaluator {
  name = 'SEO Readiness';
  private aiService: ClaudeService | MockAIService;

  constructor() {
    this.aiService = config.ai.anthropicApiKey 
      ? new ClaudeService(config.ai.anthropicApiKey)
      : new MockAIService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Analyze the SEO readiness of this website. Consider:

1. Title tag optimization and relevance
2. Meta description quality and length
3. Header tag structure (H1, H2, etc.)
4. Content quality and keyword usage
5. Technical SEO elements

Focus on:
- Title tag effectiveness (length, keywords, uniqueness)
- Meta description compelling nature and call-to-action
- Proper header hierarchy and keyword usage
- Content readability and structure
- Image alt attributes and optimization
- Overall on-page SEO best practices

Rate the SEO readiness on a scale of 0-100.

Available data:
- Title: ${websiteData.metadata.title}
- Meta Description: ${websiteData.metadata.description}
- H1 Tags: ${websiteData.metadata.h1Tags.join(', ')}
- Keywords: ${websiteData.metadata.keywords.join(', ')}
- Number of Images: ${websiteData.metadata.images.length}
    `;

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