import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { QueuedClaudeService, MockAIService } from '../services/aiService';
import { config } from '../config/environment';
import { detectIndustry, getIndustryPrompt } from '../services/promptTemplates';

export class ValuePropositionEvaluator implements Evaluator {
  name = 'Value Proposition';
  private aiService: QueuedClaudeService | MockAIService;

  constructor() {
    // Use QueuedClaude service in production, MockAI in development without API key
    this.aiService = config.ai.anthropicApiKey 
      ? new QueuedClaudeService(config.ai.anthropicApiKey)
      : new MockAIService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    // Detect industry for context-aware analysis
    const industry = detectIndustry(websiteData);
    const industryGuidance = getIndustryPrompt(industry, 'valueProposition');
    
    const enhancedPrompt = `
Analyze the value proposition of this website with industry-specific context.

CORE VALUE PROPOSITION CRITERIA:
1. Clarity of the main value proposition
2. Uniqueness and differentiation from competitors  
3. Relevance to target audience
4. Prominence and placement on the page
5. Supporting evidence and proof points

ANALYSIS FOCUS AREAS:
- How clearly the website communicates what they do
- What makes them different/better than alternatives
- Whether the value is immediately apparent to visitors
- The strength of the headline and supporting copy
- Overall messaging effectiveness
- Industry-specific value communication standards

${industryGuidance ? `
INDUSTRY-SPECIFIC CONSIDERATIONS (${industry}):
${industryGuidance}

Apply these industry standards when evaluating the value proposition.
` : ''}

DETAILED EVALUATION REQUIREMENTS:
- Assess value proposition against industry benchmarks
- Consider target audience expectations for this business type
- Evaluate competitive differentiation within the industry context
- Analyze messaging hierarchy and information architecture
- Review proof points and credibility indicators specific to this industry

Rate the value proposition strength on a scale of 0-100, considering both general best practices and industry-specific requirements.
    `;

    // Use screenshot analysis if available and using QueuedClaude
    const result = this.aiService instanceof QueuedClaudeService && websiteData.screenshot
      ? await this.aiService.analyzeWithScreenshot(websiteData, this.name, enhancedPrompt)
      : await this.aiService.analyzeWebsite(websiteData, this.name, enhancedPrompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}