import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class CTAAnalysisEvaluator implements Evaluator {
  name = 'Call-to-Action Analysis';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService()
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the CTAs PRESENT on this website (Category 3, weighted 10%).

Even a site with great messaging fails if it doesn't tell users what to do next. This category assesses both:
- PRIMARY CTAs: high-commitment actions (demo, trial, purchase, contact sales)
- LOW-FRICTION CTAs: lower-commitment lead capture (newsletter signup, content download, inquiry form, resource access)

A high-scoring site uses MULTIPLE CTA TYPES to accommodate users at different funnel stages.

SCORING CRITERIA — assess against these dimensions:
- Presence & variety: Both primary and low-friction CTAs exist on the site
- Clarity: CTA text is action-oriented and unambiguous ("Start Free Trial" not "Submit")
- Prominence: CTAs are visually distinct and easy to find without scrolling past critical content
- Funnel coverage: CTAs support users moving from awareness → consideration → decision
- Lead capture: Newsletter, download, or inquiry options are available for non-ready visitors

QUESTIONS TO ANSWER WHEN SCORING:
- Is there a clear primary CTA visible above or near the fold?
- Are there lower-friction options (newsletter, download) for visitors not yet ready to buy?
- Do CTAs appear at logical intervals throughout the page (not just at the top)?
- Is there a variety of CTA types (demo, trial, download, contact, subscribe)?
- Are mid-funnel CTAs present (e.g., "Learn More", "See How It Works") alongside conversion CTAs?

COMMON ISSUES TO IDENTIFY:
- Single CTA type only (e.g., only a "Contact Us" with no lower-commitment option)
- CTA text is vague ("Click Here", "Learn More" with no context)
- No newsletter or lead-capture mechanism
- CTAs only appear at the bottom of the page
- Weak visual design — CTA buttons don't stand out

Rate the CTA presence and effectiveness on a scale of 0–100. Cite specific CTAs, their placement, and any gaps you observed.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}