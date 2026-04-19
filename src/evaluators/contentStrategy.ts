import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class ContentStrategyEvaluator implements Evaluator {
  name = 'Content Strategy';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the CONTENT STRATEGY of this website (Category 6, weighted 10%).

The core question: "Is content used strategically across the site to drive reach, nurture, and conversion?"

This is distinct from Content-Market Fit (which assesses whether content is relevant and buyer-centric). Content Strategy assesses whether content is deployed intentionally as part of a growth engine — organized, linked, and mapped to conversion paths.

SCORING CRITERIA — assess against these key traits:
- Structured content hub or library: Content is organized by topic, use case, or role — not just dumped in a chronological blog feed
- Content-type variety: Mix of formats present (articles, case studies, guides, webinars, templates, comparison pages, use-case pages, etc.)
- Internal linking & navigation: Strategic links between content pieces, CTAs to key pages, or "related content" blocks
- Conversion path integration: Content leads logically to next actions — demo, download, sign-up, contact
- Educational focus: Clear intention to teach, explain, or help — not just announce or self-promote
- Regularity or recency: Content feels like part of a living system, not abandoned or outdated

QUESTIONS TO ANSWER WHEN SCORING:
- Is there a content hub, resource center, or library — or just a flat blog?
- Are multiple content types present (guides, case studies, webinars, templates, comparison pages)?
- Do content pieces link to related content or to conversion pages?
- Is there a clear path from a piece of content to a next action?
- Does the content serve different funnel stages — not just top-of-funnel awareness?
- Does content feel regularly maintained, or does it appear abandoned?

COMMON ISSUES TO IDENTIFY:
- A blog that's just a chronological list with no organization by topic or intent
- Only one content type (e.g., only blog posts, no case studies or guides)
- Content that dead-ends — no internal links, no CTAs, no related resources
- All content is top-of-funnel — nothing for buyers actively evaluating options
- No content for bottom-of-funnel (comparison pages, ROI calculators, case studies)
- Content clearly written for SEO only — thin, keyword-stuffed, no real value

Rate the content strategy on a scale of 0–100. Cite specific content types, structural patterns, or gaps you observed on the site.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}
