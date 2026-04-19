import { WebsiteData } from '../types/audit';
import { Evaluator, EvaluationResult } from '../types/evaluator';
import { ClaudeService } from '../services/aiService';

export class AudienceClarityEvaluator implements Evaluator {
  name = 'Audience Clarity';
  private aiService: ClaudeService;

  constructor() {
    this.aiService = new ClaudeService();
  }

  async evaluate(websiteData: WebsiteData): Promise<EvaluationResult> {
    const prompt = `
Evaluate the AUDIENCE CLARITY of this website (Category 9, weighted 10%).

The core question: "Is it obvious who the product or service is for — and does the site speak clearly to that audience's specific goals, context, and pain points?"

It's not enough to simply name an audience — the site must demonstrate real understanding of who they are, what they struggle with, and why this solution matters to them specifically. A qualified prospect should land on this site and feel like it was made for them.

SCORING CRITERIA — assess against these key traits:
- Named personas or segments: Direct mentions of industries, roles, or verticals served (e.g., "for SaaS teams," "for Revenue Ops leaders," "built for mid-market retailers")
- Audience-specific pain points: Messaging reflects real-world problems or tasks faced by the target buyer — not generic challenges anyone might have
- Tailored benefits: Features and outcomes are framed around what THIS audience needs, not generic results
- Visual cues or role-specific content: Landing pages, headers, visuals, or case studies aligned with specific personas or industries
- Use case or industry pages: Dedicated pages or sections for key verticals, roles, or scenarios
- Avoids "one size fits all" language: No overuse of vague, broad appeals that try to speak to everyone and resonate with no one

QUESTIONS TO ANSWER WHEN SCORING:
- Is it immediately clear who this product or service is for?
- Does the copy reference specific roles, industries, or company types — or is it generic?
- Are the pain points described ones that the target buyer would actually recognize?
- Do benefits feel tailored to a specific audience, or could they apply to anyone?
- Are there separate pages or sections for different segments or use cases?
- Would a qualified prospect feel "this is for me" — or would they feel uncertain?

COMMON ISSUES TO IDENTIFY:
- No mention of who the product is for anywhere on the homepage
- Messaging so broad it tries to appeal to everyone — SMBs, enterprises, nonprofits all mentioned equally
- Pain points that are too vague to resonate ("improve efficiency," "save time")
- No industry-specific language, case studies, or use cases
- Benefits that could apply to any business in any market
- Audience implied but never stated — leaving visitors to connect the dots themselves

Rate the audience clarity on a scale of 0–100. Cite specific copy, page sections, or persona signals (or their absence) that influenced your score.
    `;

    const result = await this.aiService.analyzeWebsite(websiteData, this.name, prompt);

    return {
      score: result.score,
      insights: result.insights,
      recommendations: result.recommendations,
    };
  }
}
