import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { QueuedClaudeService, MockAIService } from '../services/aiService';
import { config } from '../config/environment';

export class TrustSignalsEvaluator implements Evaluator {
  name = 'Trust Signals';
  private aiService: QueuedClaudeService | MockAIService;

  constructor() {
    this.aiService = config.ai.anthropicApiKey 
      ? new QueuedClaudeService(config.ai.anthropicApiKey)
      : new MockAIService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Analyze the trust signals and credibility indicators on this website. Consider:

1. Social proof elements (testimonials, reviews, case studies)
2. Security and privacy indicators
3. Professional design and branding
4. Contact information and transparency
5. Awards, certifications, or badges

Focus on:
- Customer testimonials and success stories
- Security badges and SSL indicators
- Professional appearance and design quality
- Clear contact information and company details
- Industry certifications or awards
- Privacy policy and terms of service
- Social media presence indicators
- Trust badges and security certifications

Rate the trust signals effectiveness on a scale of 0-100.
    `;

    const result = this.aiService instanceof QueuedClaudeService && websiteData.screenshot
      ? await this.aiService.analyzeWithScreenshot(websiteData, this.name, prompt)
      : await this.aiService.analyzeWebsite(websiteData, this.name, prompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}