import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class FeaturesAndBenefitsEvaluator implements Evaluator {
  name = 'Features and Benefits';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService()
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the FEATURES & BENEFITS presentation of this website (Category 2, weighted 10%).

The critical distinction:
- Features = what the product or service IS or DOES
- Benefits = how it HELPS the customer, what outcome it delivers

Customers buy outcomes, not features. The site must connect what it offers to why it matters.

SCORING CRITERIA — assess against these dimensions:
- Benefit framing: Features are translated into real-world customer outcomes (not just listed)
- Clarity: It's easy to understand what the product does and what value it delivers
- Audience connection: Benefits are framed around what THIS customer needs, not generic outcomes
- Completeness: The most important features have corresponding benefits explained
- Persuasiveness: Benefit messaging motivates action and reduces hesitation

EXAMPLES OF STRONG VS. WEAK FEATURE-TO-BENEFIT WRITING:
- Weak: "Automated dashboard" → Strong: "Save your team hours each week with instant insights"
- Weak: "Encrypted messaging" → Strong: "Keep your team's data secure and compliant"
- Weak: "24/7 support" → Strong: "Peace of mind that help is always available when you need it"

QUESTIONS TO ANSWER WHEN SCORING:
- Are features listed without corresponding benefits?
- Does the copy speak to outcomes and value, or just describe what the product does?
- Can a visitor clearly see how this product makes their life or business better?
- Are the benefits specific to the target audience, or generic?
- Is benefit messaging prominent or buried in fine print?

Rate the features and benefits presentation on a scale of 0–100. Cite specific copy or feature sections you observed.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}