import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class ContentMarketFitEvaluator implements Evaluator {
  name = 'Content-Market Fit';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the CONTENT-MARKET FIT of this website (Category 5, weighted 10%).

The core question: "Does the website's content reflect what today's buyers actually care about — in language they trust, across the right stages of their journey?"

This goes far beyond "is there a blog?" — it evaluates whether the content is fresh, strategic, and market-aware. A high score requires content that feels tuned to current buyer concerns, not generic filler or dated material.

SCORING CRITERIA — assess against these key traits:
- Industry relevance & timeliness: Content reflects modern challenges, frameworks, and themes (e.g., AI adoption, economic pressures, industry-specific trends) — not dated or generic fluff
- Buyer-centric tone & depth: Content speaks TO the user, not just ABOUT the company. Uses language, scenarios, or outcomes buyers care about
- Strategic funnel alignment: Different content types are present for different intent levels (education → comparison → conversion aids)
- Tactical & actionable value: Includes frameworks, how-tos, checklists, case studies, or real-world advice — not just opinion or self-promotion
- Specificity to the market: Content reflects the actual language, pain points, and priorities of the target buyer — not one-size-fits-all messaging

QUESTIONS TO ANSWER WHEN SCORING:
- Does the content address real, current pain points — or is it surface-level and generic?
- Does it feel like it was written for today's buyer, or written years ago and never updated?
- Is there content for different stages of the funnel (awareness, consideration, decision)?
- Does the language match how the target buyer actually talks and thinks?
- Is there evidence of expertise — specific insights, frameworks, or data — not just general advice?
- Does the content help the buyer make progress, or is it purely promotional?

COMMON ISSUES TO IDENTIFY:
- Blog posts that are generic, keyword-stuffed, or clearly AI-generated with no real insight
- Content that only talks about the company's product — no educational or buyer-centric value
- No content for mid or bottom-of-funnel buyers (comparison pages, case studies, ROI guides)
- Outdated content that references old trends, tools, or market conditions
- Missing content types — e.g., no case studies, no guides, no use-case-specific pages
- Tone that's too formal, too casual, or clearly mismatched for the target audience

Rate the content-market fit on a scale of 0–100. Cite specific content types, page examples, or tone observations you found on the site.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}
