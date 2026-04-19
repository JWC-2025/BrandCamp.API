import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';
import { detectIndustry, getIndustryPrompt } from '../services/promptTemplates';

export class ValuePropositionEvaluator implements Evaluator {
  name = 'Value Proposition';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService()
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    // Detect industry for context-aware analysis
    const industry = detectIndustry(websiteData);
    const industryGuidance = getIndustryPrompt(industry, 'valueProposition');
    
    const enhancedPrompt = `
Evaluate the CLEAR VALUE PROPOSITION of this website (Category 1, weighted 15%).

A strong value proposition concisely communicates three things:
1. What the company offers
2. Who it's for
3. Why it's better or different than alternatives — including direct competitors, indirect alternatives (DIY, workarounds), and the status quo

SCORING CRITERIA — assess against these five traits:
- Clarity: A first-time visitor can understand the offer in 5–8 seconds
- Specificity: Describes a concrete offering and benefit, not vague generalities
- Audience-aware: Speaks directly to the needs and desires of the target customer
- Benefit-oriented: Focuses on the value delivered, not just features listed
- Positioning-aware: Highlights what makes the brand different or better than alternatives

QUESTIONS TO ANSWER WHEN SCORING:
- Is there a headline or hero statement that clearly explains the offer?
- Can I quickly tell who this is for and why it's valuable?
- Is the message differentiated or just generic?
- Would a visitor understand what the company does in under 10 seconds?
- Is the value proposition reinforced by visuals and supporting copy?

COMMON ISSUES TO IDENTIFY:
- Generic jargon like "innovative solutions for modern businesses"
- No mention of the audience or industry
- Benefits implied but never stated explicitly
- Value prop buried below the fold
- Nothing that distinguishes them from competitors

${industryGuidance ? `
INDUSTRY-SPECIFIC CONTEXT (${industry}):
${industryGuidance}
` : ''}

Rate the value proposition strength on a scale of 0–100. Cite specific headline copy, hero sections, or messaging you observed.
    `;

    // Use screenshot analysis if available and using QueuedClaude
    const result = await this.aiService.analyzeWebsite(websiteData, this.name, enhancedPrompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}