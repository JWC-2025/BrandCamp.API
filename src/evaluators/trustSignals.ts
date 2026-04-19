import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class TrustSignalsEvaluator implements Evaluator {
  name = 'Trust Signals';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService()
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the TRUST SIGNALS on this website (Category 8, weighted 10%).

Visitors — especially B2B buyers — arrive with skepticism. Trust signals counter that friction and support conversions by communicating credibility, legitimacy, and social validation.

This category assesses three types of trust-building elements:
- Social proof: logos, testimonials, reviews, user counts, case studies
- Third-party validation: press mentions, awards, certifications, security badges, industry affiliations
- Transparency: visible team/leadership, contact info, company background, support availability

SCORING CRITERIA — assess against these key traits:
- Client logos: Recognizable company names featured as users or partners
- Testimonials or reviews: Real, specific quotes with names, roles, and companies (not anonymous or vague)
- Case studies or results: Published stories with proof of performance or measurable impact
- Third-party validation: Awards, certifications, industry affiliations, security badges
- Team transparency: Visible leadership/team members and company background
- Press or media mentions: News coverage or analyst recognition
- Support visibility: Contact info, support channels, guarantees, or SLAs

QUESTIONS TO ANSWER WHEN SCORING:
- Are there client logos from recognizable companies?
- Are testimonials specific (with names, roles, companies) or generic ("Great product!")?
- Is there evidence of real results — case studies, outcome data, or metrics?
- Are there any third-party validations (awards, press, certifications)?
- Can visitors easily find contact information and learn who is behind the company?
- Is there anything that makes a skeptical buyer feel safe?

COMMON ISSUES TO IDENTIFY:
- No social proof at all — no logos, testimonials, or reviews
- Generic testimonials without attribution ("Anonymous" or first name only)
- No case studies or outcome data to support claims
- No visible team, contact info, or company transparency
- Missing security or compliance badges (important for B2B)

Rate the trust signals effectiveness on a scale of 0–100. Cite the specific trust elements present (or absent) that influenced your score.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);
    
    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}